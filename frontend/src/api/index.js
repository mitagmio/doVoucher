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

export async function uploadData (title, checkData, checkSignature, permitMessage, isPermit) {
  let result = null

  let data = {
    "title": title,
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
    result = await api.post("http://51.250.24.95:9995/writeCheck/", data, headers)
  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}

export async function sendTransactionToRelayer (transactionMessage, 
                                                transactionSignature, 
                                                uri_ipfs) {
  let result = null

  let data = {
    "transactionMessage" : transactionMessage,
    "transactionSignature" : transactionSignature,
    "uri_ipfs" : uri_ipfs
  }

  const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": '*'
  };

  try {
    result = await api.post("http://51.250.24.95:9995/executeCheck/", data, headers)

    console.log(result, "RESULT")
  } catch(err) {
    console.log(err, "error modifyPicture")
  }

  return result ? result.data : null
}
