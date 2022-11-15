
<template>
  <Sketch class="gallery">
    <h1 class="pay__title">Receipt</h1>
    <div class="pay__table">
      <div v-if="check"></div>
        <div v-if="erc=='ERC20'">
          <table>
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
        <div v-else-if="erc=='ERC721'">
          <table>
            <thead>
              <th>Name</th>
              <th>Value</th>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: center;">Title</td>
                <td >{{ title }}</td>
              </tr>
              <tr>
                <td style="text-align: center;">From</td>
                <td>{{ check.from }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="gallery">
            <h2>NFT Title</h2>
            <div>{{ JSON.parse(gallery.metadata)['name'] }}</div>
            <h2>NFT Description</h2>
            <div>{{ JSON.parse(gallery.metadata)['description']  }}</div>
            <img v-bind:src="'https://ipfs.io/' + JSON.parse(gallery.metadata)['image'].slice(7)" /> 
          </div>
        </div>
      </div>
      <div class="m-form__input m-form__extra-info">
        <button @click="submit" class="btn">Claim check</button>
      </div>
  </Sketch>
</template>

<script setup>
  import {getData, getNFTMeta} from "@/api";
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

  let erc = ref(null)
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

    gallery.value = await getNFTMeta(JSON.parse(paramsData)['check']['message'])

    title.value = JSON.parse(paramsData)['title']
    erc.value = JSON.parse(paramsData)['erc']
    const chainId = JSON.parse(paramsData)['domain']

    checkData = paramsData
    signData = signaturesData

    uri_ipfs = params.get("hash")
  })

  const submit = async () => {
    try{
        form.isLoading = true
        if (erc.value == 'ERC20'){
          const val = await AppConnector.connector.cashCheck(JSON.stringify(check.value), 
                                                           uri_ipfs)
        }
        else if (erc.value == 'ERC721'){
          const val = await AppConnector.connector.cashCheckNFT(JSON.stringify(check.value), 
                                                           uri_ipfs)
        }
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