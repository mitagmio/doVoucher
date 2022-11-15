import {defineStore} from "pinia";
import {catToFixed} from "@/utils/string";
import {Ethereum} from "@/crypto/helpers";

export const useStore = defineStore('main', {
    state: () => ({
        isAppReady: false,
        isCollectionsLoading: false,
        isWalletConnectModalOpen: false,
        walletConnectCode: '',
        walletConnectCloseHandler: null,

        networks: [
            {id: 1, name: 'Ethereum', key: 'ether', color: '#627EEA', available: true},
            {id: 137, name: 'Polygon', key: 'matic', color: '#627EEA', available: true},
        ],
        wallets: [
            {id: 1, name: 'MetaMask', key: 'Metamask', color: '#627EEA', available: true},
            {id: 3, name: 'WalletConnect', key: 'walletconnect', color: '#D9ECFF', available: true},
            {id: 2, name: '1inch', key: '1inch', color: '#0E131D', available: true},
        ],

        connection: {
            userIdentity: null,
            userNetworkName: null,
            userNetworkSupported: false
        },

        explorers: {
            transaction: '',
            account: '',
            block: ''
        },
        shopURL: '',

        processStatus: {
            code: '',
            addition: []
        },
        userAmount: 0
    }),
    getters: {
        userIdentityShort: state => catToFixed(state.connection.userIdentity || ''),
        getExplorerLink: state => (type, hash = '') => {
            return state.explorers[type]? state.explorers[type] + hash : state.explorers.transaction + hash
        }
    },
    actions: {
        setUserAmount(value){
            this.userAmount = value
        },
        setProcessStatus(statusCode = '', ...additionParams){
            this.processStatus.code = statusCode
            this.processStatus.addition.splice(0, this.processStatus.addition.length, ...additionParams)
        },
        openWalletConnectQR(copyCode, closeHandler){
            this.walletConnectCode = copyCode
            this.walletConnectCloseHandler = closeHandler
            this.isWalletConnectModalOpen = true
        },
        closeWalletConnectQR({isAutomatic = false} = {}){
            if(!isAutomatic && this.walletConnectCloseHandler) this.walletConnectCloseHandler()
            this.isWalletConnectModalOpen = false
            this.walletConnectCloseHandler = null
        },
        setAppReady(){
            this.isAppReady = true
        },
        setUserIdentity(value = null){
            this.connection.userIdentity = value
        },
        setUserNetworkName(value = null){
            this.connection.userNetworkName = value
            if(value){
                const {
                    transactionExplorer,
                    accountExplorer,
                    blockExplorer
                } = Ethereum.getData(value)
                this.explorers.transaction = transactionExplorer
                this.explorers.account = accountExplorer
                this.explorers.block = blockExplorer
                console.log(value, 'value')
                const {store} = Ethereum.getSettings(value)
                this.shopURL = store
            }
        }

    }
})