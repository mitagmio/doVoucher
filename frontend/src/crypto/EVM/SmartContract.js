import { Contract, utils, BigNumber } from "ethers";
import {log} from "@/utils/AppLogger";
import Web3 from 'web3';
import { uploadData, uploadDataNFT, sendTransactionToRelayer } from "@/api";
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

    tokenAddressByChainId(chainId){
        if (chainId == 1){
            return '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        }
        else if (chainId == 137){
            return '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'
        }
        else{
            return "Error"
        }
    }


    async permitData(chainId, tokenContract, owner, spender, value, deadline){

        let Permit = [];
        let EIP712Domain = [];
        let buildPermitData = {};

        const tokenAddress = this.tokenAddressByChainId(chainId)
        const name = await tokenContract.name()
        const nonceOfContract = await tokenContract.nonces(owner)

        const nonce = parseInt(utils.formatUnits(nonceOfContract, "wei"))
    
        // if usdc on polygon, cause need salt for permit
        if (chainId === 137) {
            const version = await tokenContract.EIP712_VERSION()
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

            buildPermitData = JSON.stringify({
                primaryType: 'Permit',
                types: { EIP712Domain, Permit },
                domain: {
                    name,
                    version: version,
                    verifyingContract: tokenAddress,
                    salt: utils.hexZeroPad(BigNumber.from(137).toHexString(), 32)
                },
                message: { owner, 
                           spender, 
                           value, 
                           nonce: parseInt(nonce), 
                           deadline:parseInt(deadline) },
            })
        // if MAINNET
        } else if (chainId === 1) {
            const version = await tokenContract.version()
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
                    version: version,
                    chainId: chainId,
                    verifyingContract: tokenAddress,
                },
                message: { owner, 
                           spender, 
                           value, 
                           nonce: parseInt(nonce), 
                           deadline: parseInt(deadline) },
            })
        // if ROPSTEN
        } else if (chainId === 3) {
            // PERMIT_TYPEHASH = keccak256("Permit(address holder,address spender,uint256 nonce,uint256 expiry,bool allowed)");
            
        }
        return buildPermitData
    }

    parseCheck(check){
        const checkJSON = JSON.parse(check)
        const result = {
            'from': checkJSON['from'],
            'executor': checkJSON['executor'],
            'nonce': checkJSON['nonce'],
            'token': checkJSON['token'],
            'amount': checkJSON['amount'],
            'fromChainId': checkJSON['fromChainId']
        }
        return result
    }

    parseCheckNFT(check){
        const checkJSON = JSON.parse(check)
        const result = {
            'from': checkJSON['from'],
            'executor': checkJSON['executor'],
            'contractAddress': checkJSON['contractAddress'],
            'tokenId': checkJSON['tokenId'],
            'nonce': checkJSON['nonce'],
            'fromChainId': checkJSON['fromChainId']
        }
        return result
    }

    async writeCheck(title, tokenAmount, tokenAddress){

        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const connectionData = getSettings(ConnectionStore.getNetwork().name)
        const chainData = getData(ConnectionStore.getNetwork().name)
        let chainId = 0

        if (chainData)  chainId = chainData.chainId

        const owner = (await web3.eth.getAccounts())[0]

        const spender = web3.utils.toChecksumAddress(connectionData.QRCheckAddress)
        const deadline = 1669753914;
        const value = '18446205110165755834005948204546580960626098221936403173208959885300094367';

        const erc20 = TokensABI[`usdc_${connectionData.blockchain.toLowerCase()}`].ABI
        const tokenContract = new Contract(tokenAddress, erc20, provider)

        let isPermit = false
        const buildPermitData = await this.permitData(chainId, tokenContract, owner, spender, value, deadline)

        const tokenDecimals = await tokenContract.decimals()
        const tokenWithDecimals = tokenAmount * Math.pow(10, tokenDecimals)
        
        const params = [owner, buildPermitData];
        const method = 'eth_signTypedData_v4';

        const allowanceOpCall = await tokenContract.allowance(owner, spender)
        const gasData = await this.countGasPrice()
        const totalGas = gasData.totalGas
        const tokenPrice_ = gasData.tokenPrice_

        const self = this


        let valueFromSender = tokenWithDecimals + 3 * Math.round(totalGas/10**12)

        const response = new Promise((resolve) => {
            if (valueFromSender > utils.formatUnits(allowanceOpCall, "wei")) {
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
                        const args = {
                            title,
                            tokenAmount,
                            tokenAddress,
                            permitMessage: {...permitMessage, v, r, s},
                            isPermit,
                        }
                        resolve(args)


                    }
                );
            }
            else {
                isPermit = false
                try{
                    let permitMessage = {
                        'owner': '0x0000000000000000000000000000000000000000',
                        'spender': '0x0000000000000000000000000000000000000000',
                        'value': 0,
                        'deadline': 0
                    }
                    let v = 0
                    let r = '0x0000000000000000000000000000000000000000'
                    let s = '0x0000000000000000000000000000000000000000'

                    const args = {
                        title,
                        tokenAmount,
                        tokenAddress,
                        permitMessage: {...permitMessage, v, r, s},
                        isPermit
                    }
                    resolve(args)
                }
                catch (e){
                    console.log('error', e);
                }
            }
        })
        return response
    }

    async signCheck({title,
                    tokenAmount,
                    tokenAddress,
                    permitMessage,
                    isPermit}){

        const method = 'eth_signTypedData_v4';
        const provider = await this._getProvider()
        const connectionData = getSettings(ConnectionStore.getNetwork().name)
        const web3 = new Web3(provider.provider.provider);
        const owner = (await web3.eth.getAccounts())[0];
        const chainData = getData(ConnectionStore.getNetwork().name)
        let chainId = 0
        if (chainData)  chainId = chainData.chainId

        const doPay_address = web3.utils.toChecksumAddress(connectionData.QRCheckAddress)

        const doPay = TokensABI.doPayContract.ABI
        const doPayContract = new Contract(doPay_address, doPay, provider)
        const doPayNonce = await doPayContract.getNonce(owner)
        // const doPayNonce = 0
        const nonce = utils.formatUnits(doPayNonce, "wei")

        let buildCheckData = {};

        const checkRequest = [
            { name: 'from', type: 'address' },
            { name: 'executor', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'fromChainId', type: 'uint256' },
        ];
        // "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        const EIP712Domain = [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
        ]

        buildCheckData= JSON.stringify({
            primaryType: 'checkRequest',
            types: { EIP712Domain, checkRequest },
            domain: {
                name: 'QRCheck',
                version: '1',
                chainId: chainId,
                verifyingContract: doPay_address,
            },
            message: { from: owner, 
                       executor: doPay_address, 
                       token: tokenAddress,
                       amount: parseInt(tokenAmount), 
                       nonce: parseInt(nonce), 
                       fromChainId: parseInt(chainId), },
        })

        const params = [owner, buildCheckData];

        const response = new Promise((resolve) => {
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
                
                    const checkSignature = result.result;

                    try{
                        const checkData = JSON.parse(buildCheckData)

                        let response = await uploadData(title,
                                                        checkData,
                                                        checkSignature,
                                                        permitMessage,
                                                        isPermit)
                        resolve(response)
                    }
                    catch (e){
                        console.log('mint error', e);
                        return e
                    }
                }
            )
        })
        return response
    }

    async approveCheckNFT(tokenId, contractAddress){
        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const connectionData = getSettings(ConnectionStore.getNetwork().name)

        const spender = web3.utils.toChecksumAddress(connectionData.QRCheckAddress)

        const NFT = TokensABI.ERC721Contract.ABI
        const NFTContract = new Contract(contractAddress, NFT, provider)


        const approvedAddress = await NFTContract.getApproved(tokenId)

        console.log("spender:", spender)
        console.log('approvedAddress: ', approvedAddress)

        if (approvedAddress != spender){
            NFTContract.approve(spender, tokenId)
        }
    }

    async signCheckNFT(title,
        tokenId,
        contractAddress){


        const method = 'eth_signTypedData_v4';
        const provider = await this._getProvider()
        const connectionData = getSettings(ConnectionStore.getNetwork().name)
        const web3 = new Web3(provider.provider.provider);
        const owner = (await web3.eth.getAccounts())[0];
        const chainData = getData(ConnectionStore.getNetwork().name)
        let chainId = 0
        if (chainData)  chainId = chainData.chainId

        const doPay_address = web3.utils.toChecksumAddress(connectionData.QRCheckAddress)

        const doPay = TokensABI.doPayContract.ABI
        const doPayContract = new Contract(doPay_address, doPay, provider)
        const doPayNonce = await doPayContract.getNonce(owner)
        // const doPayNonce = 0
        const nonce = utils.formatUnits(doPayNonce, "wei")

        let buildCheckData = {};

        const checkRequestNFT = [
        { name: 'from', type: 'address' },
        { name: 'executor', type: 'address' },
        { name: 'contractAddress', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'fromChainId', type: 'uint256' },
        ];
        // "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        const EIP712Domain = [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' },
        ]

        buildCheckData= JSON.stringify({
        primaryType: 'checkRequestNFT',
        types: { EIP712Domain, checkRequestNFT },
        domain: {
            name: 'QRCheck',
            version: '1',
            chainId: chainId,
            verifyingContract: doPay_address,
        },
        message: { from: web3.utils.toChecksumAddress(owner), 
                executor: web3.utils.toChecksumAddress(doPay_address), 
                contractAddress: web3.utils.toChecksumAddress(contractAddress),
                tokenId: tokenId, 
                nonce: parseInt(nonce), 
                fromChainId: parseInt(chainId), },
        })
        const params = [owner, buildCheckData];

        const response = new Promise((resolve) => {
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
            
                const checkSignature = result.result;

                try{
                    const checkData = JSON.parse(buildCheckData)

                    let response = await uploadDataNFT(title,
                                                    checkData,
                                                    checkSignature)
                    resolve(response)
                }
                catch (e){
                    console.log('mint error', e);
                    return e
                }
            }
        )
        })
        return response
    }
    

    async cashCheck(check, 
                    uri_ipfs) {

        const checkData = this.parseCheck(check)

        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const owner = (await web3.eth.getAccounts())[0];

        const chainData = getData(ConnectionStore.getNetwork().name)
        let chainId = 0
        if (chainData)  chainId = chainData.chainId


        // const gasData = await this.countGasPrice()
        // const totalGas = gasData.totalGas
        // const tokenPrice_ = gasData.tokenPrice_

        // const { doPayAddress } = getSettings(ConnectionStore.getNetwork().name)
        const executorAddress = web3.utils.toChecksumAddress(checkData['executor'])

        const doPay = TokensABI.doPayContract.ABI
        const executorContract = new Contract(executorAddress, doPay, provider)
        // const executorNonce = await executorContract.getNonce(owner)
        const executorNonce = 0
        const nonce = utils.formatUnits(executorNonce, "wei")
        
        // const { chainId } = getData(ConnectionStore.getNetwork().name)
        // const deBridge_address = '0x43de2d77bf8027e25dbd179b491e8d64f38398aa';
        // const deBridge_abi = TokensABI.DebridgeContract.ABI;
        // const debridgeContract = new Contract(deBridge_address, deBridge_abi, provider)

        // const name = await doPayContract.name()

        const name = 'QRCheck'



        const checkRequest = [
            { name: 'from', type: 'address' },
            { name: 'executor', type: 'address' },
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'fromChainId', type: 'uint256' },
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
                verifyingContract: checkData['executor'],
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
                verifyingContract: checkData['executor'],
            }
        } 

        const buildExecutorData = JSON.stringify({
            primaryType: 'checkRequest',
            types: { EIP712Domain, checkRequest },
            domain,
            message: {
                from: owner,
                executor: checkData['executor'],
                token: checkData['token'],
                amount: parseInt(checkData['amount']),
                nonce: parseInt(checkData['nonce']),
                fromChainId: parseInt(checkData['fromChainId']),
            },
        });

    
        const params = [owner, buildExecutorData];
        const method = 'eth_signTypedData_v4';
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
            
                const transactionMessage = JSON.parse(buildExecutorData).message
                let fromChainId = checkData['fromChainId']
                
                const transactionSignature = result.result

                try{
                    notify({
                        title: "Transaction sent!",
                        type: "success",
                        duration: 10000
                    });

                    let tx_hash = await sendTransactionToRelayer(JSON.parse(buildExecutorData), 
                                                                 transactionSignature, 
                                                                 uri_ipfs,
                                                                 "ERC20")


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


    async cashCheckNFT(check, 
        uri_ipfs) {

        const checkData = this.parseCheckNFT(check)

        const provider = await this._getProvider()
        const web3 = new Web3(provider.provider.provider);
        const owner = (await web3.eth.getAccounts())[0];

        const chainData = getData(ConnectionStore.getNetwork().name)
        let chainId = 0
        if (chainData)  chainId = chainData.chainId

        const executorAddress = web3.utils.toChecksumAddress(checkData['executor'])

        const doPay = TokensABI.doPayContract.ABI
        const executorContract = new Contract(executorAddress, doPay, provider)
        const executorNonce = 0
        const nonce = utils.formatUnits(executorNonce, "wei")

        const name = 'QRCheck'

        const checkRequestNFT = [
        { name: 'from', type: 'address' },
        { name: 'executor', type: 'address' },
        { name: 'contractAddress', type: 'address' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'fromChainId', type: 'uint256' },
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
            verifyingContract: checkData['executor'],
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
            verifyingContract: checkData['executor'],
        }
        } 

        const buildExecutorData = JSON.stringify({
        primaryType: 'checkRequestNFT',
        types: { EIP712Domain, checkRequestNFT },
        domain,
        message: {
            from: web3.utils.toChecksumAddress(owner),
            executor: web3.utils.toChecksumAddress(checkData['executor']),
            contractAddress: web3.utils.toChecksumAddress(checkData['contractAddress']),
            tokenId: checkData['tokenId'],
            nonce: parseInt(checkData['nonce']),
            fromChainId: parseInt(checkData['fromChainId']),
        },
        });

        console.log('buildExecutorData', buildExecutorData)

        const params = [owner, buildExecutorData];
        const method = 'eth_signTypedData_v4';
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

            const transactionMessage = JSON.parse(buildExecutorData).message
            let fromChainId = checkData['fromChainId']
            
            const transactionSignature = result.result

            try{
                notify({
                    title: "Transaction sent!",
                    type: "success",
                    duration: 10000
                });

                let tx_hash = await sendTransactionToRelayer(JSON.parse(buildExecutorData), 
                                                            transactionSignature, 
                                                            uri_ipfs,
                                                            "ERC721")

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