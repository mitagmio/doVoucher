import { Contract, utils, BigNumber } from "ethers";
import {log} from "@/utils/AppLogger";
import Web3 from 'web3';
import { uploadData, sendTransactionToRelayer } from "@/api";
import {getSettings, getData} from "@/crypto/helpers/Ethereum";
import { notify } from "@kyvg/vue3-notification";

import { ethers } from "ethers"

import {
    Ethereum,
    ConnectionStore,
    TokensABI,
} from '@/crypto/helpers'


class SmartContract {

    _address = null
    _type = null

    //  ethers contract instance
    _instance = null
    _provider = null

    metaData = {
        address: null,
        name: null,
        symbol: null,
        tokens: [],
        balance: 0
    }

    /*
    * @param options: object, address = string in hex, type = 'common' || 'bundle' || 'allowList'
    * */
    constructor({address, type = 'common'}){
        this._address = address
        this._type = type
        this.metaData.address = address
    }

    async fetchMetadata(){
        const Contract = await this._getInstance()
        try{
            this.metaData.name = await Contract.name()
            this.metaData.symbol = await Contract.symbol() || ''
        }
        catch (e){
            log('[SmartContract] Error get contract meta from contract ' + this._address, e);
        }
    }

    async signInvoice(title, amount, tokenAddress){

        const method = 'eth_signTypedData_v4';
        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const connectionData = getSettings(ConnectionStore.getNetwork().name)
        const chainData = getData(ConnectionStore.getNetwork().name)
        let chainId = 0
        let nonce = 2

        let buildInvoiceData = {};

        if (chainData)  chainId = chainData.chainId

        const Invoice = [
            { name: 'title', type: 'string' },
            { name: 'value', type: 'uint256' },
            { name: 'token', type: 'address' },
        ];
        // "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        const EIP712Domain = [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
        ]

        buildInvoiceData= JSON.stringify({
            primaryType: 'Invoice',
            types: { EIP712Domain, Invoice },
            domain: {
                name: 'DoPay',
                version: '1',
                chainId: chainId,
                verifyingContract: '0xdc5782c9a6bbf67332f7bdfa96bb8d7b5fd626b0',
            },
            message: { title, value: parseInt(amount), token: tokenAddress },
        })

        const from = await web3.eth.getAccounts();

        const params = [from[0], buildInvoiceData];

        let response = null

        const response2 = new Promise((resolve) => {
            web3.currentProvider.sendAsync(
                {
                method,
                params,
                from: from[0],
                },
                async function (err, result) {
                    if (err) return console.dir(err);
                    if (result.error) {
                        alert(result.error.message);
                    }
                    if (result.error) return console.error('ERROR', result);
                
                    const invoice_signature = utils.splitSignature(result.result);
    
    
                    try{
                        const invoiceData = JSON.parse(buildInvoiceData)

                        response = await uploadData(invoiceData, invoice_signature)

                        resolve(response)
                    }
                    catch (e){
                        console.log('mint error', e);
                    }
                }
            )
        })

        return await response2
    }

    parseInvoice(invoice){
        const invoiceJSON = JSON.parse(invoice)
        const result = {
            'receiver': invoiceJSON['address'],
            'doPayAddress': invoiceJSON['domain']['verifyingContract'],
            'tokenAmount': invoiceJSON['message']['value'],
            'tokenAddress': invoiceJSON['message']['token'],
            'toChainId': invoiceJSON['domain']['chainId']
        }
        return result
    }

    async sendTransaction(invoice, uri){

        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const connectionData = getSettings(ConnectionStore.getNetwork().name)
        const chainData = getData(ConnectionStore.getNetwork().name)
        let chainId = 0

        if (chainData)  chainId = chainData.chainId

        let tokenAddress = ''

        if (chainId == 1){
            tokenAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
        else if (chainId == 137){
            tokenAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        }
        else{
            return "Error"
        }

        const invoiceData = this.parseInvoice(invoice)

        const owner = (await web3.eth.getAccounts())[0]
        const spender = web3.utils.toChecksumAddress(invoiceData['doPayAddress'])
        const tokenAmount = invoiceData['tokenAmount']
        const deadline = 1669753914;

        const erc20 = TokensABI[`usdc_${connectionData.blockchain.toLowerCase()}`].ABI
        const tokenContract = new Contract(tokenAddress, erc20, provider)
        const name = await tokenContract.name()
        const nonceOfContract = await tokenContract.nonces(owner)

        const tokenDecimals = await tokenContract.decimals()
        const tokenWithDecimals = tokenAmount * Math.pow(10, tokenDecimals)

        const nonce = parseInt(utils.formatUnits(nonceOfContract, "wei"))
        const value = '18446205110165755834005948204546580960626098221936403173208959885300094367';
        const allowed = true

        let isPermit = false
        let Permit = [];
        let EIP712Domain = [];
        let buildPermitData


        // if usdc on polygon, cause need salt for permit
        if (chainId === 137) {
            Permit = [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ];

            EIP712Domain = [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'verifyingContract', type: 'address' },
                { name: 'salt', type: 'bytes32' }
            ]

            const version = await tokenContract.EIP712_VERSION()

            buildPermitData = JSON.stringify({
                primaryType: 'Permit',
                types: { EIP712Domain, Permit },
                domain: {
                    name,
                    version: version,
                    verifyingContract: tokenAddress,
                    salt: utils.hexZeroPad(BigNumber.from(137).toHexString(), 32)
                },
                message: { owner, spender, value, nonce, deadline },
            })
            console.log('tokenAddress', tokenAddress)
        // if MAINNET
        } else if (chainId === 1) {
            // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
            Permit = [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ];
            // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
            EIP712Domain = [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ]

            buildPermitData= JSON.stringify({
                primaryType: 'Permit',
                types: { EIP712Domain, Permit },
                domain: {
                    name,
                    version: '2',
                    chainId: 1,
                    verifyingContract: tokenAddress,
                },
                message: { owner, spender, value, nonce, deadline },
            })
        // if ROPSTEN
        } else if (chainId === 3) {
            // PERMIT_TYPEHASH = keccak256("Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)");
            
        }
        
        const params = [owner, buildPermitData];
        const method = 'eth_signTypedData_v4';
        const self = this;

        const allowanceForwarder = await tokenContract.allowance(owner, spender)


        const gasData = await this.countGasPrice()
        const totalGas = gasData.totalGas
        const tokenPrice_ = gasData.tokenPrice_


        let valueFromSender = tokenWithDecimals + 3 * Math.round(totalGas/10**12)


        if (valueFromSender > utils.formatUnits(allowanceForwarder, "wei")) {
            isPermit = true
            web3.currentProvider.sendAsync(
                {
                method,
                params,
                from: owner,
                },
                async function (err, result) {
                    if (err) return console.dir(err);
                    if (result.error) {
                        alert(result.error.message);
                    }
                    if (result.error) return console.error('ERROR', result);
                
                    const { v,r,s } = utils.splitSignature(result.result);

                    let permitMessage = {
                        'owner': owner,
                        'spender': spender,
                        'value': value,
                        'deadline': deadline,
                        'v': v ,
                        'r': r,
                        's': s
                    }
                    // console.log('Permit: ', permitMessage, v, r, s)

                    // try{
                        // const tx = await contract.permit(owner, spender, value, deadline, v, r, s, { gasLimit: 100000 })
                        // console.log(toNetwork, 'toNetwork')
                    const args = {
                        invoice,
                        uri,
                        permitMessage: {...permitMessage, v, r, s},
                        isPermit,
                        tokenWithDecimals,
                        tokenAddress
                    }

                    await self.executeForwardContract(args)
                    // }
                    // catch (e){
                    //     console.log('mint error', e);
                    // }
                }
            );
        }
        else {
            try{
                let permitMessage = {
                    'owner': '',
                    'spender': '',
                    'value': 0,
                    'deadline': 0
                }
                let v = 0
                let r = ''
                let s = ''

                const args = {
                    invoice,
                    uri,
                    permitMessage: {...permitMessage, v, r, s},
                    isPermit,
                    tokenWithDecimals,
                    tokenAddress
                }

                await self.executeForwardContract(args)
            }
            catch (e){
                console.log('mint error', e);
            }
        }
    }
    

    async executeForwardContract({
        invoice,
        uri,
        permitMessage,
        isPermit,
        tokenWithDecimals,
        tokenAddress
    }) {

        const invoiceData = this.parseInvoice(invoice)
        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const owner = (await web3.eth.getAccounts())[0];

        const receiver = invoiceData['receiver']
        const toChainId = invoiceData['toChainId']

        const gasData = await this.countGasPrice()
        const totalGas = gasData.totalGas
        const tokenPrice_ = gasData.tokenPrice_

        const valueFromSender = tokenWithDecimals 
        const valueToReceiver = tokenWithDecimals - 3 * Math.round(totalGas/10**12)	 // gas

        // const { doPayAddress } = getSettings(ConnectionStore.getNetwork().name)
        const doPay_address = web3.utils.toChecksumAddress('0xdc5782c9a6bbf67332f7bdfa96bb8d7b5fd626b0')

        const doPay = TokensABI.doPayContract.ABI
        const doPayContract = new Contract(doPay_address, doPay, provider)
        const doPayNonce = await doPayContract.getNonce(owner)
        const nonce = utils.formatUnits(doPayNonce, "wei")
        
        const { chainId } = getData(ConnectionStore.getNetwork().name)
        const deBridge_address = '0x43de2d77bf8027e25dbd179b491e8d64f38398aa';
        const deBridge_abi = TokensABI.DebridgeContract.ABI;
        const debridgeContract = new Contract(deBridge_address, deBridge_abi, provider)

        const name = await doPayContract.name()



        const doPayRequest = [
            { name: 'from', type: 'address' },
            { name: 'bridge', type: 'address' },
            { name: 'receiver', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'valueFromSender', type: 'uint256' },
            { name: 'valueToReceiver', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'toChainId', type: 'uint256' },
        ];

        let EIP712Domain = [];

        let domain = {}

        // if usdc on polygon, cause need salt for permit
        if (chainId === 137) {
            
            EIP712Domain = [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ]

            domain = {
                name,
                version: '1',
                chainId: 137,
                verifyingContract: doPay_address,
            }

        // if MAINNET
        } else if (chainId === 1) {
            // keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
            EIP712Domain = [
                { name: 'name', type: 'string' },
                { name: 'version', type: 'string' },
                { name: 'chainId', type: 'uint256' },
                { name: 'verifyingContract', type: 'address' },
            ]

            domain = {
                name,
                version: '1',
                chainId: 1,
                verifyingContract: doPay_address,
            }
        } 

        const buildForwardData = JSON.stringify({
            primaryType: 'doPayRequest',
            types: { EIP712Domain, doPayRequest },
            domain,
            message: {
                from: owner,
                bridge: doPay_address,
                receiver: receiver,
                token: tokenAddress,
                valueFromSender: Math.round(valueFromSender).toString(),
                valueToReceiver: valueToReceiver.toString(),
                nonce: parseInt(nonce),
                toChainId,
            },
        });


        const deBridgeMessage =  {
            'data': '0x',
            'executionFee': 3000000,
            'receiver': receiver,
            'permit': '0x',
            'useAssetFee': false,
            'referralCode': 0
        }
    
        const params = [owner, buildForwardData];
        const method = 'eth_signTypedData_v4';
        web3.currentProvider.sendAsync(
            {
            method,
            params,
            from: owner,
            },
            async function (err, result) {
                // console.log(err, 'err 3')
                // console.log(result, 'result 3')
                if (err) return console.dir(err);
                if (result.error) {
                    alert(result.error.message);
                }
                if (result.error) return console.error('ERROR', result);
            
                const transactionMessage = JSON.parse(buildForwardData).message
                let fromChainId = 0
                if (JSON.parse(buildForwardData).domain.chainId){
                    console.log(1)
                    fromChainId = JSON.parse(buildForwardData).domain.chainId
                }
                else{
                    console.log(JSON.parse(buildForwardData))
                    fromChainId = parseInt(JSON.parse(buildForwardData).domain.salt)
                }
                
                const transactionSignature = result.result

                try{
                    notify({
                        title: "Transaction sent!",
                        type: "success",
                        duration: 10000
                    });

                    console.log(transactionMessage)

                    console.log(deBridgeMessage)

                    let fee = ethers.BigNumber.from("500000000000000000")

                    const options = {value: fee}

                    // console.log('validate:', await doPayContract.functions.executeCrossChainTransfer(transactionMessage, 
                    //                                                                                 transactionSignature,
                    //                                                                                 deBridgeMessage,
                    //                                                                                 options));


                    let tx_hash = await sendTransactionToRelayer(transactionMessage, 
                                                                 permitMessage, 
                                                                 deBridgeMessage,
                                                                 transactionSignature, 
                                                                 String(fromChainId),
                                                                 isPermit,
                                                                 uri)

                    if (!tx_hash) {
                        notify({
                            title: "Oh, smth wrong!",
                            text: tx_hash || 'Transaction failed for some reasons',
                            type: "error",
                            duration: 20000
                        });
                    } else {
                        let link = "";
                        if (fromChainId == '1'){
                            link = "etherscan.io"
                        }
                        else if (fromChainId == '137'){
                            link = "polygonscan.com"
                        }
                        notify({
                            title: "Transaction result:",
                            text: `<a target="_blank" href="https://${link}/tx/${tx_hash}">Transaction link<a>`,
                            duration: 20000
                        });
                    }

                }
                catch (e){
                    notify({
                        title: "Oh, smth wrong!",
                        text: e,
                        type: "error",
                        duration: 10000
                    });
                    console.log('sendAsync executeForwardContract error', e);
                }
            }
        );

    }


    async fetchBalance(){
        const provider = await this._getProvider()

        // todo: defaultActiveToken change on current tokenId from list
        const { erc20AbiName, nativeAddress, blockchain, defaultActiveToken } = getSettings(ConnectionStore.getNetwork().name)
        // console.log(erc20AbiName, 'erc20AbiName')
        const web3 = new Web3(provider.provider.provider);
        const native = web3.utils.toChecksumAddress(nativeAddress)
        const owner = (await web3.eth.getAccounts())[0]
        const erc20 = TokensABI[erc20AbiName].ABI
        const stableErc20 = TokensABI[`usdc_${blockchain.toLowerCase()}`].ABI
        const stableContract = new Contract(defaultActiveToken, stableErc20, provider)

        const contractNative = new Contract(native, erc20, provider)
        // console.log(web3.eth.defaultCommon, '-----WEB3')

        const nativeBalance = await web3.eth.getBalance(owner)
        const nativeDecimals = await contractNative.decimals()
        const nativeName = await contractNative.symbol()

        const nativeAmount = utils.formatUnits(nativeBalance, "wei") / (10 ** nativeDecimals)
        // console.log(stableContract, 'stableContract')

        const tokenBalance = await stableContract.balanceOf(owner)
        const tokenDecimals = await stableContract.decimals()
        const tokenName = await stableContract.symbol()

        const tokenAmount = utils.formatUnits(tokenBalance, "wei") / (10 ** tokenDecimals)
        // console.log(tokenAmount, 'tokenAmount')

        return {
            native: {
                name: nativeName,
                amount: nativeAmount
            },
            token: {
                name: tokenName,
                amount: tokenAmount
            },
        }
    }
   
    async countGasPrice() {
        const tokensAmount = '0'
        const { blockchain, chainlinkPriceAddress, defaultActiveToken, chainlinkRpc } = getSettings(ConnectionStore.getNetwork().name)
        const receiver = '0xAe584Eb4F714a7735bF005649a804b6942627cb2'
        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const aggregatorV3InterfaceABI = TokensABI.ChainLinkABI.ABI
        const chainlinkWeb3 = new Web3(chainlinkRpc)
        const chainlinkPrices = web3.utils.toChecksumAddress(chainlinkPriceAddress)
        const priceFeed = new chainlinkWeb3.eth.Contract(aggregatorV3InterfaceABI, chainlinkPrices)

        // todo: count gas for all networks
        // currently only polygon/eth check more
        const erc20 = TokensABI[`usdc_${blockchain.toLowerCase()}`].ABI
        const contract = new Contract(defaultActiveToken, erc20, provider)

        let tokenPrice = null

        await priceFeed.methods.latestRoundData().call()
            .then((roundData) => {
                // Do something with roundData
                // console.log("roundData.answer.length", roundData.answer.length === 8)
                if (roundData.answer.length === 8) {
                    tokenPrice = `0,${roundData.answer}`
                } else {
                    tokenPrice = roundData.answer / 10 ** 8
                }
                // console.log(roundData, 'roundData.answer')
            })

        let estimation = await contract.estimateGas.transfer(receiver, tokensAmount);
        estimation = utils.formatUnits(estimation, "wei")


        let gasPrice = await provider.getGasPrice()
        gasPrice = utils.formatUnits(gasPrice, "wei")

        let tokenPrice_ = parseFloat(tokenPrice.toString().replace(",", "."));

        let totalGas = estimation * gasPrice * tokenPrice_
        return { totalGas, tokenPrice_ }
    }

    async _getInstance(){
        if(!this._instance){
            this._instance = await new Promise( async (resolve) => {
                let abi = TokensABI.default.ABI
                if(this._address == null)
                    this._address = Ethereum.getSettings(ConnectionStore.getNetwork().name).tokenAddress
                const contract = new Contract(this._address, abi, this._getProvider())
                resolve(contract)
            })
        }
        return this._instance
    }

    _getProvider(){
        if(!this._provider) this._provider = ConnectionStore.getProvider();
        return this._provider
    }

}

export default SmartContract