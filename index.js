
require('dotenv').config()
const{ ChainId, Fetcher, WETH, Route}=require('@uniswap/sdk')
const express = require('express')
const bodyParser = require('body-parser')
const http = require('http')
const Web3 = require('web3')
const HDWalletProvider = require('@truffle/hdwallet-provider')
const numeral = require('numeral')
const _ = require('lodash')
const ethapi = require('etherscan-api').init(process.env.ETHAPI)
const axios = require('axios')

// SERVER CONFIG
const PORT = process.env.PORT || 5000
const app = express();
const server = http.createServer(app).listen(PORT, () => console.log(`Listening on ${ PORT }`))

// WEB3 CONFIG
const web3 = new Web3(process.env.RPC_URL)


const chainId = ChainId.MAINNET;
let contractAddress = web3.utils.toChecksumAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F') // must be checksummed
const decimals = 18
const weth= WETH[chainId]


//Get Price
async function getprice(weth,chainId,contractAddress){
	let token = await Fetcher.fetchTokenData(chainId, contractAddress);
	let pair= await Fetcher.fetchPairData(token,weth);
	let route=new Route([pair],weth);

	return route.midPrice.toSignificant(6)
}

// //Token ABI

async function getContractFromAddress(contractAddress) {
    let contractABI = JSON.parse((await ethapi.contract.getabi(contractAddress)).result)
    let tokenContract = new web3.eth.Contract(contractABI,contractAddress)
    return tokenContract
}


let priceMonitor
let monitoringPrice = false

async function monitorPrice() {
  if(monitoringPrice) {
    return
  }

  console.log("Checking prices...")
  monitoringPrice = true

  try {

    
   let tokenContract = await getContractFromAddress(contractAddress)

    console.table([{
      "inputTokenSymbol": weth.symbol,
      "inputTokenAddress": weth.address,
      "outputTokenSymbol": String(await tokenContract.methods.symbol().call()),
      "outputTokenAddress": contractAddress,
      "Price Per Ether:" : await getprice(weth,chainId,contractAddress)
    }])


  } catch (error) {
    console.error(error)
    monitoringPrice = false
    clearInterval(priceMonitor)
    return
  }

  monitoringPrice = false
}

// Check markets every n seconds
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 3000 // 3 Seconds
priceMonitor = setInterval(async () => { await monitorPrice() }, POLLING_INTERVAL)
