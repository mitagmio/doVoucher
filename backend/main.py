from typing import Union
import unittest
from fastapi import FastAPI
from pydantic import BaseModel
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account.messages import encode_structured_data, encode_defunct
from eth_account import Account
import eth_utils
from eth_abi import encode_abi
from eth_keys import keys
from fastapi.middleware.cors import CORSMiddleware
import os
from os.path import join, dirname
from dotenv import load_dotenv
import requests
import json

dotenv_path = join(dirname(__file__), '.env')
load_dotenv(dotenv_path)
w3 = Web3(Web3.HTTPProvider("https://rpc.ankr.com/polygon"))


owner = w3.toChecksumAddress('0xB24471e4b038D82090AD03ac7bD9abCC5303D3aa')
owner_pk = os.getenv("OWNER_PK_1")
infura_key_1 = os.getenv("INFURA_KEY_1")
infura_key_2 = os.getenv("INFURA_KEY_2")
pass_key = os.getenv("PASS_KEY")


abi = open("./ABI/QRCheck.json", "r")
abi_USDC_eth = open("./ABI/usdc_eth.json", "r")
abi_USDC_poly = open("./ABI/usdc_poly.json", "r")

usdc_address_eth = w3.toChecksumAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
usdc_address_poly = w3.toChecksumAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')
qrCheck_eth = w3.toChecksumAddress('0x9cff7c429f9d31f6cbf9958e551e40aa382c563c')
doPay_poly = w3.toChecksumAddress('0x9cff7c429f9d31f6cbf9958e551e40aa382c563c')
deBridge_address = w3.toChecksumAddress('0x43de2d77bf8027e25dbd179b491e8d64f38398aa')

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def sendToIPFS(params):

    files = {'file': str(params)}
    response_ipfs = requests.post('https://ipfs.infura.io:5001/api/v0/add', 
                    files=files, 
                    auth=(infura_key_1,infura_key_2))

    return json.loads(response_ipfs.text)['Hash']

def getFromIPFS(hash):
    projectId = infura_key_1
    projectSecret = infura_key_2
    endpoint = "https://ipfs.infura.io:5001"

    ### READ FILE WITH HASH ###
    params = {
        'arg': hash
    }
    response = requests.post(endpoint + '/api/v0/cat', params=params, auth=(projectId, projectSecret))
    return response.text.replace("'", '"').strip('\"')

def checkingSignature(msg, signature):
    str_msg = str(msg).replace("'", '"').strip('\"')
    message = encode_structured_data(json.loads(str_msg))
    return Account.recover_message(message, signature = signature)

def checkingSignatureNFT(msg, signature):

    str_msg = str(msg).replace("'", '"').strip('\"')

    try:
        tokenId = int(json.loads(str_msg)['message']['tokenId'])
        str_msg = str(msg).replace("'", '"').strip('\"').replace('"'+str(tokenId)+'"', str(tokenId))
        message = encode_structured_data(json.loads(str_msg))
        return Account.recover_message(message, signature = signature)
    except:
        tokenId = int('0x'+json.loads(str_msg)['message']['tokenId'], 16)
        str_msg = str(msg).replace("'", '"').strip('\"').replace('"'+json.loads(str_msg)['message']['tokenId']+'"', str(tokenId))
        message = encode_structured_data(json.loads(str_msg))

        return Account.recover_message(message, signature = signature)

class Execute(BaseModel):
    transactionMessage: dict
    permitMessage: dict
    deBridgeMessage: dict
    transactionSignature: str
    fromChainId: str
    isPermit: bool
    invoiceIpfsUri: str

class ExecuteCheck(BaseModel):
    transactionMessage: dict
    transactionSignature: str
    uri_ipfs: str
    erc: str

class Invoice(BaseModel):
    address: str
    invoice_params: dict
    invoice_hash: str
    invoice_number: str

class Check(BaseModel):
    title: str
    erc: str
    checkData: dict
    checkSignature: str
    permitMessage: dict
    isPermit: bool

class CheckNFT(BaseModel):
    title: str
    erc: str
    checkData: dict
    checkSignature: str


@app.post("/")
async def send_transaction(execute: Execute):
    if int(execute.fromChainId) == 1:
        w3 = w3_ethereum
        abi = open("./ABI/QRCheck.json", "r")
        abi_deBridge = open("./ABI/deBridge.json", "r")
        # token = w3.eth.contract(address=w3.toChecksumAddress(usdc_address_eth), abi=abi_USDC_eth.read())
        doTransfer = w3.eth.contract(address=doPay_eth, abi=abi.read())
        deBridge = w3.eth.contract(address=deBridge_address, abi=abi_deBridge.read())
    elif int(execute.fromChainId) == 137:
        w3 = w3_polygon
        abi = open("./ABI/QRCheck.json", "r")
        abi_deBridge = open("./ABI/deBridge.json", "r")
        # token = w3.eth.contract(address=w3.toChecksumAddress(usdc_address_poly), abi=abi_USDC_poly.read())
        doPay = w3.eth.contract(address=doPay_poly, abi=abi.read())
        deBridge = w3.eth.contract(address=deBridge_address, abi=abi_deBridge.read())
    else:
        return "Bad chainId"

    # print(doTransfer.functions.name.call())
    fee = deBridge.functions.globalFixedNativeFee().call()



    execute.transactionMessage['valueFromSender'] = int(execute.transactionMessage['valueFromSender'])
    execute.transactionMessage['valueToReceiver'] = int(execute.transactionMessage['valueToReceiver'])
    execute.transactionMessage['nonce'] = int(execute.transactionMessage['nonce'])

    if execute.isPermit:
        execute.permitMessage['value'] = int(execute.permitMessage['value'])
        execute.permitMessage['deadline'] = int(execute.permitMessage['deadline'])
    
        
    # balance_from = token.functions.balanceOf(execute.forwarder['from']).call()
    value_from = execute.transactionMessage['valueFromSender']

    # if balance_from>=value_from:

    if execute.isPermit==True and int(execute.transactionMessage['toChainId']) == int(execute.fromChainId):
        print('1')
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee+100000,
            maxPriorityFeePerGas=w3.eth.gas_price+100000,
            gas=200000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=0,
            data=doPay.encodeABI(fn_name='executeTransferPermit', 
                                args=[tuple(execute.transactionMessage.values()), 
                                    tuple(execute.permitMessage.values()),
                                    execute.transactionSignature
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
    
    elif (execute.isPermit==False) and int(execute.transactionMessage['toChainId']) == int(execute.fromChainId):
        print('2')
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee,
            maxPriorityFeePerGas=w3.eth.gas_price,
            gas=150000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=0,
            data=doPay.encodeABI(fn_name='executeTransfer', 
                                args=[tuple(execute.transactionMessage.values()),
                                    execute.transactionSignature
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())

    elif (execute.isPermit==True) and int(execute.transactionMessage['toChainId']) != int(execute.fromChainId):
        print('3')
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=100*10000000000,#w3.eth.gas_price+w3.eth.max_priority_fee,
            maxPriorityFeePerGas=100000000000,#w3.eth.gas_price,
            gas=1000000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=fee,
            data=doPay.encodeABI(fn_name='executeCrossChainTransferPermit', 
                                args=[tuple(execute.transactionMessage.values()), 
                                    tuple(execute.permitMessage.values()),
                                    execute.transactionSignature,
                                    tuple(execute.deBridgeMessage.values()),
                                    'QmcVQ86rw2pN6tWvpzoxP8EYXMJtNmx2tx8EUxj4AN1PLA'
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())

    elif (execute.isPermit==False) and int(execute.transactionMessage['toChainId']) != int(execute.fromChainId):
        print('4')
        baseFee = w3.eth.fee_history(1, 'latest')['baseFeePerGas'][0]
        max_priority_fee = w3.eth.max_priority_fee
        gas_price = w3.eth.gas_price
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=baseFee + max_priority_fee + 10000,
            maxPriorityFeePerGas=max_priority_fee+ 10000,
            gas=1000000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=fee,
            data=doPay.encodeABI(fn_name='executeCrossChainTransfer', 
                                args=[tuple(execute.transactionMessage.values()), 
                                    execute.transactionSignature,
                                    tuple(execute.deBridgeMessage.values())
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
    return success.hex()
    # return "Balance too low"

@app.post("/executeCheck/")
async def sendExecuteCheck(executeCheck: ExecuteCheck):

    w3 = Web3(Web3.HTTPProvider("https://rpc.ankr.com/polygon"))

    checkSignature = getFromIPFS(executeCheck.uri_ipfs[:46])
    checkData = getFromIPFS(executeCheck.uri_ipfs[46:])


    fromChainId = executeCheck.transactionMessage['message']['fromChainId']

    sender = json.loads(checkData)['check']['message']['from']

    if int(fromChainId) == 1:
        # w3 = w3_ethereum
        # w3 = w3_ethereum
        abi = open("./ABI/QRCheck.json", "r")
        abi_deBridge = open("./ABI/deBridge.json", "r")
        # token = w3.eth.contract(address=w3.toChecksumAddress(usdc_address_eth), abi=abi_USDC_eth.read())
        qrCheck = w3.eth.contract(address=qrCheck_eth, abi=abi.read())
        deBridge = w3.eth.contract(address=deBridge_address, abi=abi_deBridge.read())

    elif int(fromChainId) == 137:
        # w3 = w3_polygon
        abi = open("./ABI/QRCheck.json", "r")
        abi_deBridge = open("./ABI/deBridge.json", "r")
        # token = w3.eth.contract(address=w3.toChecksumAddress(usdc_address_poly), abi=abi_USDC_poly.read())
        qrCheck = w3.eth.contract(address=qrCheck_eth, abi=abi.read())
        deBridge = w3.eth.contract(address=deBridge_address, abi=abi_deBridge.read())
    else:
        return "Bad chainId"
    

    if executeCheck.erc == "ERC20":

        singnature_sender = checkingSignature(json.loads(checkData)['check'], json.loads(checkSignature)['check'])

        if sender != singnature_sender:
            return 'Error'

        receiver_address = checkingSignature(executeCheck.transactionMessage, executeCheck.transactionSignature)

        if json.loads(checkData)['permitOwner'] == '0x0000000000000000000000000000000000000000':

            signed_txn = w3.eth.account.sign_transaction(dict(
                nonce=w3.eth.get_transaction_count(owner),
                maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee+100000,
                maxPriorityFeePerGas=w3.eth.gas_price+100000,
                gas=200000,
                to=w3.toChecksumAddress(executeCheck.transactionMessage['message']['executor']),
                value=0,
                data=qrCheck.encodeABI(fn_name='executeCheck', 
                                    args=[tuple(json.loads(checkData)['check']['message'].values()), 
                                        json.loads(checkSignature)['check'],
                                        receiver_address
                                        ]),
                chainId=w3.eth.chain_id,
                ),
                owner_pk,
            )
            success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
            
            return success.hex()
        else:
            permitMessage = [
                json.loads(checkData)['permitOwner'],
                json.loads(checkData)['permitSpender'],
                int(json.loads(checkData)['permitValue']),
                int(json.loads(checkData)['permitDeadline']),
                json.loads(checkSignature)['permitV'],
                json.loads(checkSignature)['permitR'],
                json.loads(checkSignature)['permitS']
            ]


            print(qrCheck.functions.verifyCheck(json.loads(checkData)['check']['message'], 
                                                json.loads(checkSignature)['check']).call())

            signed_txn = w3.eth.account.sign_transaction(dict(
                nonce=w3.eth.get_transaction_count(owner),
                maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee+100000,
                maxPriorityFeePerGas=w3.eth.gas_price+100000,
                gas=200000,
                to=w3.toChecksumAddress(executeCheck.transactionMessage['message']['executor']),
                value=0,
                data=qrCheck.encodeABI(fn_name='executeCheckPermit', 
                                    args=[tuple(json.loads(checkData)['check']['message'].values()), 
                                        tuple(permitMessage),
                                        json.loads(checkSignature)['check'],
                                        receiver_address
                                        ]),
                chainId=w3.eth.chain_id,
                ),
                owner_pk,
            )
            success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
            
            return success.hex()
    
    elif executeCheck.erc == "ERC721":

        checkMessage = json.loads(checkData)['check']

        checkMessage['message']['tokenId'] = int(checkMessage['message']['tokenId'])

        singnature_sender = checkingSignatureNFT(checkMessage, json.loads(checkSignature)['check'])

        if sender != singnature_sender:
            return 'Error sign'

        
        receiver_address = checkingSignatureNFT(executeCheck.transactionMessage, executeCheck.transactionSignature)

        verify = qrCheck.functions.verifyCheckNFT(checkMessage['message'], 
                                        json.loads(checkSignature)['check']).call()

        

        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee+100000,
            maxPriorityFeePerGas=w3.eth.gas_price+100000,
            gas=200000,
            to=w3.toChecksumAddress(executeCheck.transactionMessage['message']['executor']),
            value=0,
            data=qrCheck.encodeABI(fn_name='executeCheckNFT', 
                                args=[tuple(checkMessage['message'].values()),
                                    json.loads(checkSignature)['check'],
                                    receiver_address
                                    ]),
            chainId=w3.eth.chain_id,
            ),
            owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
        
        return success.hex()

    execute.transactionMessage['valueFromSender'] = int(execute.transactionMessage['valueFromSender'])
    execute.transactionMessage['valueToReceiver'] = int(execute.transactionMessage['valueToReceiver'])
    execute.transactionMessage['nonce'] = int(execute.transactionMessage['nonce'])

    if execute.isPermit:
        execute.permitMessage['value'] = int(execute.permitMessage['value'])
        execute.permitMessage['deadline'] = int(execute.permitMessage['deadline'])
    
        
    # balance_from = token.functions.balanceOf(execute.forwarder['from']).call()
    value_from = execute.transactionMessage['valueFromSender']

    # if balance_from>=value_from:

    if execute.isPermit==True and int(execute.transactionMessage['toChainId']) == int(execute.fromChainId):
        print('1')
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee+100000,
            maxPriorityFeePerGas=w3.eth.gas_price+100000,
            gas=200000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=0,
            data=doPay.encodeABI(fn_name='executeTransferPermit', 
                                args=[tuple(execute.transactionMessage.values()), 
                                    tuple(execute.permitMessage.values()),
                                    execute.transactionSignature
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
    
    elif (execute.isPermit==False) and int(execute.transactionMessage['toChainId']) == int(execute.fromChainId):
        print('2')
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee,
            maxPriorityFeePerGas=w3.eth.gas_price,
            gas=150000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=0,
            data=doPay.encodeABI(fn_name='executeTransfer', 
                                args=[tuple(execute.transactionMessage.values()),
                                    execute.transactionSignature
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())

    elif (execute.isPermit==True) and int(execute.transactionMessage['toChainId']) != int(execute.fromChainId):
        print('3')
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=100*10000000000,#w3.eth.gas_price+w3.eth.max_priority_fee,
            maxPriorityFeePerGas=100000000000,#w3.eth.gas_price,
            gas=1000000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=fee,
            data=doPay.encodeABI(fn_name='executeCrossChainTransferPermit', 
                                args=[tuple(execute.transactionMessage.values()), 
                                    tuple(execute.permitMessage.values()),
                                    execute.transactionSignature,
                                    tuple(execute.deBridgeMessage.values()),
                                    'QmcVQ86rw2pN6tWvpzoxP8EYXMJtNmx2tx8EUxj4AN1PLA'
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())

    elif (execute.isPermit==False) and int(execute.transactionMessage['toChainId']) != int(execute.fromChainId):
        print('4')
        baseFee = w3.eth.fee_history(1, 'latest')['baseFeePerGas'][0]
        max_priority_fee = w3.eth.max_priority_fee
        gas_price = w3.eth.gas_price
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=baseFee + max_priority_fee + 10000,
            maxPriorityFeePerGas=max_priority_fee+ 10000,
            gas=1000000,
            to=w3.toChecksumAddress(execute.transactionMessage['bridge']),
            value=fee,
            data=doPay.encodeABI(fn_name='executeCrossChainTransfer', 
                                args=[tuple(execute.transactionMessage.values()), 
                                    execute.transactionSignature,
                                    tuple(execute.deBridgeMessage.values())
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
    return success.hex()
    # return "Balance too low"

           


@app.get("/get_refund/{receiver}/{password}/{chainId}")
async def transfer_token(
    receiver: str,
    password: str,
    chainId: str
):
    if password == pass_key:
        if int(chainId) == 1:
            w3 = w3_ethereum
            doTransfer = w3.eth.contract(address=w3_ethereum.toChecksumAddress('0x39c62b375e210d4dfec3cad2dc15b41174a4e573'), 
                                                                                abi=abi.read())
            token = w3.eth.contract(address=w3_ethereum.toChecksumAddress(usdc_address_eth), abi=abi_USDC_eth.read())
        elif int(chainId) == 137:
            w3 = w3_polygon
            doTransfer = w3.eth.contract(address=w3_polygon.toChecksumAddress('0x39c62b375e210d4dfec3cad2dc15b41174a4e573'), 
                                                                                abi=abi.read())
            token = w3.eth.contract(address=w3_polygon.toChecksumAddress(usdc_address_poly), abi=abi_USDC_poly.read())
        else:
            return "Bad chainId"
        receiver = w3.toChecksumAddress(receiver)
        signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=w3.eth.max_priority_fee+3000000000,
            maxPriorityFeePerGas=w3.eth.max_priority_fee,
            gas=280740,
            to=w3.toChecksumAddress(doTransfer.address),
            value=0,
            data=doTransfer.encodeABI(fn_name='getFunds', args=[token.address, receiver]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
        success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())
        return success.hex()
    else:
        return 'Idi nahuy'

@app.get("/modified_transactions/{tx_hash}/")
async def transfer_token(
    tx_hash: str
):
    if int(chainId) == 1:
        w3 = w3_ethereum
        doTransfer = w3.eth.contract(address=w3_polygon.toChecksumAddress(doTransfer_eth), 
                                                                            abi=abi.read())
        token = w3.eth.contract(address=w3_ethereum.toChecksumAddress(usdc_address_eth), abi=abi_USDC_eth.read())
    elif int(chainId) == 137:
        w3 = w3_polygon
        doTransfer = w3.eth.contract(address=w3_polygon.toChecksumAddress('0x39c62b375e210d4dfec3cad2dc15b41174a4e573'), 
                                                                            abi=abi.read())
        token = w3.eth.contract(address=w3_polygon.toChecksumAddress(usdc_address_poly), abi=abi_USDC_poly.read())
    else:
        return "Bad chainId"
    # print(tx_hash)
    tranz = w3.eth.get_transaction(tx_hash)
    
    modified_tranza = w3.eth.modify_transaction(tx_hash, gasPrice=w3.eth.gas_price)


    return modified_tranza.hex

@app.get("/send_approve/{token}/{approveAddress}/{value}/")
async def transfer_token(
    token: str,
    approveAddress: str,
    value: str
):
    # if int(chainId) == 1:
    #     w3 = w3_ethereum
    #     doTransfer = w3.eth.contract(address=w3.toChecksumAddress('0xc7d78cb7c3cc064adc96c6285d8524c0c1b3fded'), 
    #                                                                         abi=abi.read())
    # elif int(chainId) == 137:
    #     w3 = w3_polygon
    #     doTransfer = w3.eth.contract(address=w3.toChecksumAddress('0xc7d78cb7c3cc064adc96c6285d8524c0c1b3fded'), 
    #                                                                         abi=abi.read())
    # else:
    #     return "Bad chainId"
    # # print(tx_hash)
    w3 = w3_ethereum
    doTransfer = w3.eth.contract(address=w3.toChecksumAddress('0xc7d78cb7c3cc064adc96c6285d8524c0c1b3fded'), 
                                                                                abi=abi.read()) 

    signed_txn = w3.eth.account.sign_transaction(dict(
            nonce=w3.eth.get_transaction_count(owner),
            maxFeePerGas=w3.eth.gas_price+w3.eth.max_priority_fee,
            maxPriorityFeePerGas=w3.eth.gas_price,
            gas=100000,
            to=w3.toChecksumAddress('0xc7d78cb7c3cc064adc96c6285d8524c0c1b3fded'),
            value=0,
            data=doTransfer.encodeABI(fn_name='sendArrove', 
                                args=[token, 
                                    approveAddress,
                                    int(value)
                                    ]),
            chainId=w3.eth.chain_id,
        ),
        owner_pk,
        )
    success = w3.eth.send_raw_transaction(signed_txn.rawTransaction.hex())                                                                            


    return success.hex

@app.post("/send_invoice/")

async def send_invoice(invoice: Invoice):

    invoice.invoice_params['address'] = invoice.address
    invoice.invoice_params['hash'] = invoice.invoice_hash
    invoice.invoice_params['number'] = invoice.invoice_number

    files = {'file': str(invoice.invoice_params)}

    response_ipfs = requests.post('https://ipfs.infura.io:5001/api/v0/add', 
                         files=files, 
                         auth=(infura_key_1, infura_key_2))

    return 'https://voucher.donft.io/pay?hash='+json.loads(response_ipfs.text)['Hash']


@app.post("/writeCheck/")

async def writeCheck(check: Check):

    signatures = {}
    params = {}

    signatures['check'] = check.checkSignature
    signatures['permitR'] = check.permitMessage['r']
    signatures['permitS'] = check.permitMessage['s']
    signatures['permitV'] = check.permitMessage['v']

    hash_signature = sendToIPFS(signatures)


    params['title'] = check.title
    params['check'] = check.checkData
    params['erc'] = check.erc
    params['isPermit'] = str(check.isPermit)
    params['permitOwner'] = check.permitMessage['owner']
    params['permitSpender'] = check.permitMessage['spender']
    params['permitValue'] = check.permitMessage['value']
    params['permitDeadline'] = str(check.permitMessage['deadline'])

    hash_params = sendToIPFS(params)

    return 'https://voucher.donft.io/pay?hash='+hash_signature+hash_params

@app.post("/writeCheckNFT/")

async def writeCheckNFT(check: CheckNFT):

    signatures = {}
    params = {}

    signatures['check'] = check.checkSignature

    hash_signature = sendToIPFS(signatures)


    params['title'] = check.title
    params['check'] = check.checkData
    params['erc'] = check.erc

    hash_params = sendToIPFS(params)

    return 'https://voucher.donft.io/pay?hash='+hash_signature+hash_params


@app.get("/get_ipfs/{hash}/")
async def transfer_token(
    hash: str
):
    return getFromIPFS(hash)
