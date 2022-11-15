import axios from "axios"
import Web3 from 'web3';

const web3 = new Web3('https://rpc.ankr.com/polygon');

let api  = axios.create({
  baseURL: process.env.VUE_APP_API_URL,
  timeout: 60000,
  // headers: {
  //   post: {
  //     "Access-Control-Allow-Origin": '*'
  //   }
  // }
})

export default api

export async function getData (hash) {
  let result = null
  try {
    result = await axios.get("https://opback.donft.io/get_ipfs/"+hash)

  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}

export async function getNFTBalance (address, chain) {

  const url = 'https://deep-index.moralis.io/api/v2/'+address+'/nft'

  const options = {
    method: 'GET',
    url: url,
    params: {chain: chain, format: 'decimal', normalizeMetadata: 'false'},
    
  };

  const params = {chain: chain, format: 'decimal', normalizeMetadata: 'false'}
    // timeout: 60000,
  const headers =  {accept:      'application/json', 
                      'X-API-Key': 'NU6lG3xkyM2hbqwkpUv4aRg0sQz2xX1XVkLLdJlx7ye9nTGHHxQi1EVjRjeE6T0X'
                      }

  let result = null
  try {
    result = await axios.get(url, { 
                                    params: params,
                                    headers: headers
                                  })

  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  console.log(result.data)
  return result ? result.data : null
}

export async function getNFTMeta (meta) {
  console.log('Meta:', meta)

  let chain = 'ethereum'

  const address = meta['contractAddress']
  const tokenId = meta['tokenId']
  const chainId = meta['fromChainId']

  if (chainId == 137){
    chain = 'polygon'
  }

  const url = 'https://deep-index.moralis.io/api/v2/nft/'+address+'/'+tokenId

  const params = {chain: chain, format: 'decimal', normalizeMetadata: 'false'}
    // timeout: 60000,
  const headers =  {accept:      'application/json', 
                      'X-API-Key': 'NU6lG3xkyM2hbqwkpUv4aRg0sQz2xX1XVkLLdJlx7ye9nTGHHxQi1EVjRjeE6T0X'
                      }

  let result = null
  try {
    result = await axios.get(url, { 
                                    params: params,
                                    headers: headers
                                  })

  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  console.log(result)
  // console.log(result.data)
  return result ? result.data : null
}

export async function uploadData (title, checkData, checkSignature, permitMessage, isPermit) {
  let result = null

  let data = {
    "title": title,
    "erc": 'ERC20',
    "checkData": checkData,
    "checkSignature" : checkSignature,
    "permitMessage" : permitMessage,
    "isPermit" : isPermit
  }


  const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": '*'
  };

  try {
    result = await api.post("https://opback.donft.io/writeCheck/", data, headers)
  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}

export async function uploadDataNFT (title, checkData, checkSignature) {
  let result = null

  let data = {
    "title": title,
    "erc": 'ERC721',
    "checkData": checkData,
    "checkSignature" : checkSignature
  }


  const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": '*'
  };

  try {
    result = await api.post("https://opback.donft.io/writeCheckNFT/", data, headers)
  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}

export async function sendTransactionToRelayer (transactionMessage, 
                                                transactionSignature, 
                                                uri_ipfs,
                                                erc) {
  let result = null

  let data = {
    "transactionMessage" : transactionMessage,
    "transactionSignature" : transactionSignature,
    "uri_ipfs" : uri_ipfs,
    "erc": erc
  }

  const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": '*'
  };

  console.log("data:",data)

  try {
    result = await api.post("https://opback.donft.io/executeCheck/", data, headers)

    console.log(result, "RESULT")
  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}
