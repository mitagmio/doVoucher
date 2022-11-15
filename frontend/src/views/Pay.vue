
<template>
  <Sketch class="gallery">
    <h1 class="pay__title">Receipt</h1>
    <div class="pay__table">
      <table v-if="check" >
        <thead>
          <th>Name</th>
          <th>Value</th>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">Title</td>
            <td >{{ title }}</td>
          </tr>
          <tr v-for="(item, key) in check" :key="key">
            <td style="text-align: center;">{{ key }}</td>
            <td v-if="item === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'">{{ "USDC" }}</td>
            <td v-else>{{ item}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="m-form__input m-form__extra-info">
        <button @click="submit" class="btn">Claim check</button>
      </div>
  </Sketch>
</template>

<script setup>
  import {getData} from "@/api";
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

  const initialState = {
    amount: 0,
    address: '',
    tokenId: '',
    fromNetwork: '1',
    toNetwork: '1',
    isLoading: false,
    gasPriceLoading: false
  };


  const {
      connection,
      isCollectionsLoading,
      userAmount
  } = storeToRefs(store)

  const form = reactive({...initialState})



  let checkData
  let signData

  let check = ref(null)
  let title = ref(null)
  let uri_ipfs = ''
  let uri_ipfs_params = ''

  onMounted(async () => {
    let uri = window.location.search.substring(1); 
    let params = new URLSearchParams(uri);
    const ipfs_hash_signatures = params.get("hash").slice(0, 46)
    const ipfs_hash_params = params.get("hash").slice(46)
    const signaturesData = await getData(ipfs_hash_signatures)
    const paramsData = await getData(ipfs_hash_params)


    check.value = JSON.parse(paramsData)['check']['message']
    title.value = JSON.parse(paramsData)['title']
    const chainId = JSON.parse(paramsData)['domain']

    checkData = paramsData
    signData = signaturesData

    uri_ipfs = params.get("hash")
  })

  const submit = async () => {
    try{
        form.isLoading = true
        const val = await AppConnector.connector.cashCheck(JSON.stringify(check.value), 
                                                           uri_ipfs)
    }
    catch (e) {
        console.log(e);
    }
    finally {
        form.isLoading = false
    }
  }

  
</script>


<style>
  table,
  th,
  td {
    padding: 10px;
    border: 1px solid black;
    border-collapse: collapse;
    margin: auto;
    width: 180px;
    text-align: center;
  }
</style>