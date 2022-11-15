import {useStore} from "@/store/main";
import {storeToRefs} from "pinia";
import {computed, ref, watch} from "vue";

export function useWalletConnection(){
    const store = useStore()

    const {
        connection,
        networks: networkOptions,
        wallets: walletOptions
    } = storeToRefs(store);

    const network = ref('ether')
    const wallet = ref(null)
    watch(network, (newValue) => {
        if(newValue === 'near') wallet.value = null
    })

    const filteredNetworkOptions = computed(() => {
        return [...networkOptions.value].map(w => ({...w})).map((networkItem) => {
            let available = false
            if(networkItem.available){
                if(wallet.value === 'ledger'){
                    if(networkItem.key !== 'near' && networkItem.key !== 'evm') available = true
                }
                else available = true
            }
            networkItem.available = available
            return networkItem
        })
    })

    const filteredWalletOptions = computed(() => {
        return [...walletOptions.value].map(w => ({...w})).map((wallet) => {
            let available = false
            if(wallet.available){
                if(network.value === 'evm'){
                    if(wallet.key !== 'ledger') available = true
                }
                else available = network.value !== 'near';
            }
            wallet.available = available
            return wallet
        })
    })

    const networkAssets = '/img/connect/'

    const submitAvailable = computed(() => {
        if(!network.value) return
        if(network.value !== 'near') return wallet.value
        else return !wallet.value
    })

    const isOpen = computed(() => !connection.value.userIdentity)
    return {
        isOpen,
        networks: filteredNetworkOptions,
        wallets: filteredWalletOptions,
        selectedNetwork: network,
        selectedWallet: wallet,
        networkAssets,
        close: () => {
            // can`t close
        },
        setNetwork: value => {
            console.log(value);
            network.value = value
        },
        setWallet: value => wallet.value = value,
        submitAvailable
    }
}
