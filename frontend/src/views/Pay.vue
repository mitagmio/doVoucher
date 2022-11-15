
<template>
  <Sketch class="gallery">
    <h1 class="pay__title">Receipt</h1>
    <div class="pay__table">
      <table v-if="invoice" >
        <thead>
          <th>Name</th>
          <th>Value</th>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">Mercant</td>
            <td >{{ invoice_info}}</td>
          </tr>
          <tr v-for="(item, key) in invoice" :key="key">
            <td style="text-align: center;">{{ key }}</td>
            <td v-if="item === '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'">{{ "USDC" }}</td>
            <td v-else>{{ item}}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="m-form__input m-form__extra-info">
        <button @click="submit" class="btn">Submit receipt</button>
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



  let invoiceData

  let invoice = ref(null)
  let invoice_info = ref(null)
  let uri_ipfs = ''

  onMounted(async () => {
    let uri = window.location.search.substring(1); 
    let params = new URLSearchParams(uri);
    invoiceData= await getData(params.get("hash"))

    invoice.value = JSON.parse(invoiceData)['message']
    invoice_info.value = JSON.parse(invoiceData)['address']
    const chainId = JSON.parse(invoiceData)['domain']['chainId']

    uri_ipfs = params.get("hash")
  })

  const submit = async () => {
    try{
        form.isLoading = true
        const val = await AppConnector.connector.sendTransaction(invoiceData, uri_ipfs)
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