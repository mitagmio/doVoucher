import axios from "axios"

const api  = axios.create({
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
    result = await axios.get("http://51.250.24.95:9995/get_ipfs/"+hash)

  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}

export async function uploadData (invoice_params, invoice_signature) {
  let result = null

  let data = {
    "invoice_params" : invoice_params,
    "invoice_signature" : invoice_signature
  }

  const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": '*'
  };

  try {
    console.log(data)
    result = await api.post("http://51.250.24.95:9995/send_invoice/", data, headers)

    console.log(result, "RESULT")
  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}

export async function sendTransactionToRelayer (transactionMessage, 
                                      permitMessage, 
                                      deBridgeMessage, 
                                      transactionSignature, 
                                      fromChainId, 
                                      isPermit,
                                      invoiceIpfsUri) {
  let result = null

  let data = {
    "transactionMessage" : transactionMessage,
    "permitMessage" : permitMessage,
    "deBridgeMessage" : deBridgeMessage,
    "transactionSignature" : transactionSignature,
    "fromChainId" : fromChainId,
    "isPermit" : isPermit,
    "invoiceIpfsUri" : invoiceIpfsUri
  }

  const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": '*'
  };

  try {
    console.log(data)
    result = await api.post("http://51.250.24.95:9995/", data, headers)

    console.log(result, "RESULT")
  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}
