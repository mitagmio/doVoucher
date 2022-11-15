
<template>
  <Sketch
    class="gallery"
    v-if="connection.userIdentity"
  >
    <!--<h1 class="gallery__title">Invoice</h1>-->
    <div
      class="m-form"
      v-if="!form.isLoading && !qrCode"
    >
      <div class="m-form__input">
        <h2>Decription</h2>
        <br>
        <div class="m-form__input-row">
          <input placeholder="Description" type="text" v-model="form.title">
        </div>
      </div>
      <div class="m-form__input m-form__select">
        <h3>Amount</h3>
        <div class="m-form__select-row">
          <SelectComponent
            :list-options="tokensLists"
            :list-key="getSettings(ConnectionStore.getNetwork().name).tokens"
            :model-value="form.tokenAddress"
            @change="selectToken"
          />
          <input placeholder="amount to send" type="text" v-model="form.amount">
        </div>
      </div>
      <div class="m-form__input m-form__extra-info">
        <button @click="submit" class="btn">Make check</button>
      </div>
      <!-- <div v-if="gallery">{{ gallery }}</div> -->
    </div>
    <div class="pay__qr__div" v-else-if="qrCode">
      <vue-qrcode :value='qrCode' :options="{ width: 200 }" ></vue-qrcode>
      <br>
      <div><a :href="qrCode">Link</a>&nbsp&nbsp&nbsp<span @click="copy(qrCode)"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 115.77 122.88" style="enable-background:new 0 0 115.77 122.88" xml:space="preserve"><g><path class="st0" d="M89.62,13.96v7.73h12.19h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02v0.02 v73.27v0.01h-0.02c-0.01,3.84-1.57,7.33-4.1,9.86c-2.51,2.5-5.98,4.06-9.82,4.07v0.02h-0.02h-61.7H40.1v-0.02 c-3.84-0.01-7.34-1.57-9.86-4.1c-2.5-2.51-4.06-5.98-4.07-9.82h-0.02v-0.02V92.51H13.96h-0.01v-0.02c-3.84-0.01-7.34-1.57-9.86-4.1 c-2.5-2.51-4.06-5.98-4.07-9.82H0v-0.02V13.96v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07V0h0.02h61.7 h0.01v0.02c3.85,0.01,7.34,1.57,9.86,4.1c2.5,2.51,4.06,5.98,4.07,9.82h0.02V13.96L89.62,13.96z M79.04,21.69v-7.73v-0.02h0.02 c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v64.59v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h12.19V35.65 v-0.01h0.02c0.01-3.85,1.58-7.34,4.1-9.86c2.51-2.5,5.98-4.06,9.82-4.07v-0.02h0.02H79.04L79.04,21.69z M105.18,108.92V35.65v-0.02 h0.02c0-0.91-0.39-1.75-1.01-2.37c-0.61-0.61-1.46-1-2.37-1v0.02h-0.01h-61.7h-0.02v-0.02c-0.91,0-1.75,0.39-2.37,1.01 c-0.61,0.61-1,1.46-1,2.37h0.02v0.01v73.27v0.02h-0.02c0,0.91,0.39,1.75,1.01,2.37c0.61,0.61,1.46,1,2.37,1v-0.02h0.01h61.7h0.02 v0.02c0.91,0,1.75-0.39,2.37-1.01c0.61-0.61,1-1.46,1-2.37h-0.02V108.92L105.18,108.92z"/></g></svg></span></div>
      <!--<br>
      <div><button @click="copy(qrCode)" class="btn">Copy link</button></div>-->
    </div>
    <LoaderElement class="collections" v-if="form.isLoading">Loading...</LoaderElement>
  </Sketch>
</template>

<script setup>
    import { getNFTBalance } from "@/api";
    import Web3 from 'web3';
    import Sketch from '@/components/UI/Sketch'
    import LoaderElement from '@/components/UI/Loader'
    import SelectComponent from '@/components/UI/SelectComponent/Index'
    import {getSettings} from "@/crypto/helpers/Ethereum";
    import {ConnectionStore} from '@/crypto/helpers'

    import {useStore} from "@/store/main";
    import {reactive, ref, onMounted, watch} from "vue";
    import {storeToRefs} from "pinia";
    import AppConnector from "@/crypto/AppConnector";

    import tokensLists from '@/components/helpers/tokensLists'
    import networksList from '@/components/helpers/networksList'

    const store = useStore()
    const isTransfer = ref(true)
    let userBalance = ref(null)
    let qrCode = ref(null)
    let gallery = ref(null)

    const initialState = {
      title: '',
      amount: 0,
      tokenAddress: '',
      isLoading: false,
      gasPriceLoading: false
    };


    const {
        connection,
        isCollectionsLoading,
        userAmount
    } = storeToRefs(store)

    const form = reactive({...initialState})

    // console.log('Owner', connection.userIdentity)

    watch(() => connection.value.userIdentity, (newValue) => {
        if(newValue) {
          const tokenDefault = getSettings(ConnectionStore.getNetwork().name)

          if (tokenDefault && tokenDefault.defaultActiveToken) {
            form.tokenAddress = tokenDefault.defaultActiveToken
          }
        }

        if (!newValue) resetPage()
    })

    onMounted(() => {
      const tokenDefault = getSettings(ConnectionStore.getNetwork().name)

      if (tokenDefault && tokenDefault.defaultActiveToken) {
        getGallery()
        // getUserBalance()
        form.tokenAddress = tokenDefault.defaultActiveToken
      }
    })

    const resetPage = () => {
      Object.assign(form, initialState);
      gasPrice.value = null
    }

    const selectToken = (data) => {
      form.tokenId = data.id
    }

    const selectSource = (data) => {
      form.fromNetwork = data.id
    }

    const selectDestination = (data) => {
      form.toNetwork = data.id
    }

    const getGallery = async() => {
      const chain = connection.value.userNetworkName.split('_')[0]

      const NFTBalance = await getNFTBalance(connection.value.userIdentity, chain)

      console.log('NFTBalance: ', NFTBalance.result[0])

      gallery.value = NFTBalance.result
    }


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

    const copy = async (qrCode) => {
      await navigator.clipboard.writeText(qrCode);
    }

    const submit = async () => {
        try{
            form.isLoading = true
            const val = await AppConnector.connector.writeCheck(form.title, form.amount, form.tokenAddress)
            console.log(val, '---VAL')
            qrCode.value = val
        }
        catch (e) {
            console.log(e);
        }
        finally {
            form.isLoading = false
        }
    }
</script>

<style lang="scss">

.m-form__head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  button:first-child {
    margin-top: 20px;
    margin-right: 10px;
  }
}

.m-form__input {
  display: flex;
  flex-direction: column;
  align-items: flex-start;

  .btn {
    width: 100%;
  }

  h3 {
    margin-bottom: 20px;
  }
}

.main-btn {
	background-color: #2d0949;
	border: 2px solid #000;
	color: #efefef;
	cursor: pointer;
	padding: 10px 15px;
  font-size: 16px;
	transition: background-color .1s ease-in-out;
	min-width: 150px;
	max-width: 250px;
	text-align: center;


	span {
		color: #efefef;
	}

	&:hover {
		color: #000;
		background-color:#5ce9bc;

		span {
			color: #000;
		}
	}

	&:disabled {
		box-shadow: none;
		background-color: rgba(58, 31, 79, .4);
		color: #00000047;
		cursor: not-allowed;
		transform: none;

		&:hover {
			background-color: rgba(58, 31, 79, .4);
			color: #00000047;
	
			span {
				color: #00000047;
			}
		}
	}
}

.m-form__gas {
  font-size: 16px;
  border-radius: 4px;
  color: #000;
  margin-bottom: 24px;
  opacity: 1;
  transform: opacity .3s linear;

  &.loading {
    opacity: .5;
  }
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.8s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.m-form {
  position: relative;
}

.m-form__input {
  .head p {
    margin-bottom: 10px;
    font-size: 16px;
    color: #000;
    background: #fff;
    padding: 7px 10px;
    border-radius: 4px;
    
    b {
      color: #2283cb;
    }
  }
}

.m-form__input--balance {
  position: absolute;
  top: -40px;
  left: 60px;
}

.m-form__input--gas {
  display: flex;
  justify-content: space-between;
  position: relative;
  flex-wrap: wrap;

  span:first-child {
    font-size: 14px;
  }
}

.sketch__main.gallery {
  position: relative;
  margin: auto;

  span {
    font-weight: 500;
  }
}

.m-form__input-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  h3 {
    margin-bottom: 0;
    margin-right: 20px
  }
}

.m-form__extra-info {
  width: 100%;
  display: flex;
  justify-content: flex-start;
  position: relative;
  margin-top: 24px;
  margin-bottom: 8px;

  span {
    font-size: 12px;
  }

  .form__error {
    position: absolute;
    background-color: rgba(255, 0, 0, 0.8);
    padding: 5px 10px;
    color: #fff;
    right: 0;
    border-radius: 4px;
    opacity: 0;
    transition: opacity .2s ease;

    &.active {
      opacity: 1;
    }

  }
}

.m-form__input-column {
  display: flex;
  width: 100%;
  justify-content: flex-start;
  align-items: flex-start;
  flex-direction: column;

  .m-form__networks & {
    width: 45%;

    @media screen and (max-width: 560px) {
      width: 100%;
    }
  }

  h3 {
    margin-bottom: 10px;
  }
}

.m-form__networks {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;

  .direction {
    position: relative;
    top: 10px;
    font-size: 16px;
  }

  @media screen and (max-width: 560px) {
    flex-direction: column;

    .m-form__input-column {
      width: 100%;
    }
  }
}

</style>