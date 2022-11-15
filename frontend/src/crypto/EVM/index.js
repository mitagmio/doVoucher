import {
    Ethereum,
    ConnectionStore,
} from '@/crypto/helpers'
import SmartContract from '@/crypto/EVM/SmartContract.js'
import alert from "@/utils/alert";

class EVM {

    constructor(){

    }


    /* ---------- Connected methods ON  ----------  */
    async init(){
        return await this.connector.init(this)
    }
    async connectToWallet(value){
        return await this.connector.connectToWallet(value)
    }
    async checkInchInjected(){
        return await this.connector.checkInchInjected()
    }
    async disconnect(){
        return await this.connector.disconnect()
    }

    async isUserConnected(){
        return await this.connector.isUserConnected()
    }

    async countGasPriceHandler(){
        const Contract = new SmartContract({ address: null })
        return await Contract.countGasPrice()
    }

    async writeCheck(title, amount, tokenAddress){
        const Contract = new SmartContract({ address: null })
        const args = await Contract.writeCheck(title, amount, tokenAddress)
        const response = await Contract.signCheck(args)
        return response
    }

    async writeCheckNFT(title, tokenId, contractAddress){
        const Contract = new SmartContract({ address: null })
        console.log('tokenId, contractAddress', tokenId, contractAddress)
        await Contract.approveCheckNFT(tokenId, contractAddress)
        const response = await Contract.signCheckNFT(title, tokenId, contractAddress)
        return response
    }

    async cashCheck(check, uri_ipfs){
        const Contract = new SmartContract({ address: null })
        return await Contract.cashCheck(check, uri_ipfs)
    }

    async cashCheckNFT(check, uri_ipfs){
        const Contract = new SmartContract({ address: null })
        return await Contract.cashCheckNFT(check, uri_ipfs)
    }

    async fetchBalanceAmount(){
        const Contract = new SmartContract({ address: null })
        return await Contract.fetchBalance()
    }

    async getContractProvider(){
        const {fetchAmount} = Ethereum.getData(ConnectionStore.getNetwork().name)

        const Contract = new SmartContract({
            address: fetchAmount
        })

        return Contract._getProvider()
    }

    tryToConnectToUnsupportedNetwork(){
        console.log('network not supported')
        alert.open('Sorry, we did not support this network')
    }

}

export default EVM