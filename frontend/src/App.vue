<template>
    <div class="root">
        <notifications />
        <template v-if="isAppReady">
            <router-view/>
            <ChooseWalletModal/>
            <AlertModal/>
        </template>
        <LoaderElement v-else class="absolute with-bg"/>
    </div>
</template>

<script setup>
    import AlertModal from '@/components/UI/Alert'
    import ChooseWalletModal from '@/components/modals/chooseWallet/Modal'
    import LoaderElement from '@/components/UI/Loader'

    import AppConnector from "@/crypto/AppConnector";
    import {useStore} from "@/store/main";
    import {storeToRefs} from "pinia";
    import {onMounted} from "vue";
    const store = useStore()
    const {
        isAppReady
    } = storeToRefs(store);

    onMounted(async () => {
        try{
            await AppConnector.init()
        }
        catch (e){
            console.log('user not connected', e);
        }
        finally {
            store.setAppReady()
        }
    })
</script>

<style>
.root {
    height: 100%;
}

.vue-notification-group {
    right: 20px!important;
    top: 100px!important;
    width: auto!important;
}

.vue-notification {
    border-radius: 5px;
    font-size: 16px!important;
}
</style>