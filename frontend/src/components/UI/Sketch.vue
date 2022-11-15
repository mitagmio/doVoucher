<template>
  <div class="sketch">
    <div
      :class="['sketch__header', {
        active: isOpen
      }]"
    >
      <div class="sketch__header-row">
        <div class="sketch__logo">
          doPay
        </div>
        <div
          class="header__right desktop"
        >
          <div class="header__right-wrap">
            <div class="identity box" v-if="connection.userIdentity">
              <p
                class="identity__wallet"
                 v-text="userIdentityShort"
              >
              </p>
              <div class="identity__logout" @click="logout">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="#6755A1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.3333 14.1667L17.4999 10L13.3333 5.83334" stroke="#6755A1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17.5 10H7.5" stroke="#6755A1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
            </div>
            <div class="identity box" v-else>
              Connect wallet
            </div>
          </div>
        </div>
        <div
          :class="['header__right mobile', {
            active: isOpen
          }]"
        >
          <div class="header__right-wrap">
            <div class="identity box" v-if="connection.userIdentity">
              <p
                class="identity__wallet"
                 v-text="userIdentityShort"
                 @click="isOpen = !isOpen"
              >
              </p>
            </div>
          </div>
        </div>
        <div class="header__mobile-menu" v-if="isOpen">
          <div class="header__mobile-menu__bg" @click="isOpen = false"></div>
          <div class="header__mobile-menu-inner">
            <div class="header__mobile-menu__item">
              <div class="identity__logout">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clip-path="url(#clip0_81_719)">
                    <path d="M16.6667 7.5H9.16667C8.24619 7.5 7.5 8.24619 7.5 9.16667V16.6667C7.5 17.5871 8.24619 18.3333 9.16667 18.3333H16.6667C17.5871 18.3333 18.3333 17.5871 18.3333 16.6667V9.16667C18.3333 8.24619 17.5871 7.5 16.6667 7.5Z" stroke="#846BCB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M4.16675 12.5H3.33341C2.89139 12.5 2.46746 12.3244 2.1549 12.0118C1.84234 11.6993 1.66675 11.2754 1.66675 10.8333V3.33332C1.66675 2.8913 1.84234 2.46737 2.1549 2.15481C2.46746 1.84225 2.89139 1.66666 3.33341 1.66666H10.8334C11.2754 1.66666 11.6994 1.84225 12.0119 2.15481C12.3245 2.46737 12.5001 2.8913 12.5001 3.33332V4.16666" stroke="#846BCB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  </g>
                  <defs>
                  <clipPath id="clip0_81_719">
                    <rect width="20" height="20" fill="white"/>
                  </clipPath>
                  </defs>
                </svg>
              </div>
              <span>Copy address</span>
            </div>
            <div class="header__mobile-menu__item" @click="logout">
              <div class="identity__logout">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.5 17.5H4.16667C3.72464 17.5 3.30072 17.3244 2.98816 17.0118C2.67559 16.6993 2.5 16.2754 2.5 15.8333V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H7.5" stroke="#6755A1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M13.3333 14.1667L17.4999 10L13.3333 5.83334" stroke="#6755A1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M17.5 10H7.5" stroke="#6755A1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <span>Logout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="sketch__main" :class="$attrs.class">
      <slot></slot>
    </div>
    <div class="sketch__footer">
      © 2022 doNFT & Quantor, All Rights Reserved.
    </div>
  </div>
</template>

<script>
    export default {
        inheritAttrs: false
    }
</script>

<script setup>
    import {ref, onMounted, watch} from "vue";
    import {useStore} from "@/store/main";
    import {storeToRefs} from "pinia";
    import {ConnectionStore} from '@/crypto/helpers'
    import AppConnector from "@/crypto/AppConnector";
    const store = useStore()
    const {
        connection,
        userIdentityShort,
        getExplorerLink
    } = storeToRefs(store);
    const openContractManage = () => store.changeManageContractView(true)
    const logout = async () => {
        await ConnectionStore.logOut()
    }

    let userBalance = ref({})
    let isOpen = ref(false)

    watch(() => connection.value.userIdentity, (newValue) => {
        if (newValue) getUserBalance()

        if (!newValue) userBalance.value = {}
    })

    onMounted(() => {
      if (connection.value.userIdentity) getUserBalance()
    })

    const getUserBalance = async () => {
        try{
          const balance = await AppConnector.connector.fetchBalanceAmount()
          console.log(balance, 'getUserBalance')
          userBalance.value = balance
        }
        catch (e) {
            console.log(e);
        }
    }
</script>