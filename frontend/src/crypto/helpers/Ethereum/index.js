import {ethers} from "ethers";
import {useStore} from "@/store/main";

const networks = {
    mainnet: {
        name: "mainnet",
        chainId: 1,
        transactionExplorer: "https://etherscan.io/tx/",
        accountExplorer: "https://etherscan.io/address/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://opensea.io/assets/ethereum/${contractAddress}/${tokenID}`,
        gasLimit: 400000
    },
    ropsten: {
        name: "ropsten",
        chainId: 3,
        transactionExplorer: "https://ropsten.etherscan.io/tx/",
        accountExplorer: "https://ropsten.etherscan.io/address/",
        blockExplorer: "https://ropsten.etherscan.io/tx/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://testnets.opensea.io/assets/ropsten/${contractAddress}/${tokenID}`,
        gasLimit: 700000
    },
    rinkeby: {
        name: "rinkeby",
        chainId: 4,
        transactionExplorer: "https://rinkeby.etherscan.io/tx/",
        accountExplorer: "https://rinkeby.etherscan.io/address/",
        blockExplorer: "https://rinkeby.etherscan.io/tx/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://testnets.opensea.io/assets/rinkeby/${contractAddress}/${tokenID}`,
        gasLimit: 700000
    },
    maticmum: {
        name: "maticmum",
        chainId: 80001,
        transactionExplorer: "https://mumbai.polygonscan.com/tx/",
        accountExplorer: "https://mumbai.polygonscan.com/address/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://testnets.opensea.io/assets/mumbai/${contractAddress}/${tokenID}`,
        gasLimit: 400000
    },
    polygon_mainnet: {
        name: "polygon_mainnet",
        chainId: 137,
        transactionExplorer: "https://polygonscan.com/tx/",
        accountExplorer: "https://polygonscan.com/address/",
        marketplaceExplorer: (contractAddress, tokenID) => `https://opensea.io/assets/matic/${contractAddress}/${tokenID}`,
        gasLimit: 400000
    }
}

const settings = {
    mainnet: {
        api: 'https://api.rarible.org/v0.1',
        chainlinkRpc: 'https://rpc.ankr.com/eth',
        blockchain: 'ETHEREUM',
        erc20AbiName: 'mainnetErc20',
        tokens: 'tokensMainnet',

        chainlinkPriceAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
        QRCheckAddress: '0x8b5898820fd26b88aff3aed623e271c26837c36b',
        // for initing erc20 contract
        nativeAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', //weth
        defaultActiveToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // usdc
    },
    maticmum: {
        api: 'https://api.rarible.org/v0.1',
        store: 'https://testnets.opensea.io',
        blockchain: 'POLYGON',
        characterContract: '0x610d1f5149031185b264245d340108c15a1a01dc',
        thingContract: '0xfa44bb5e1b8c7be977cd5001008bc1caeee16e6a',
        colorContract: '0xa95107620a198d7b141b32e42ff298f935a97585',
        achievements: '0x1AF0454bcc3944B2cc94BD2D95A5E8354A0d68aa',

        whiteListContract: '0x4a74ba982b0229fdb4c9e69930ad9bb4a8bf9810',
    },
    ropsten: {
        api: 'https://api.rarible.org/v0.1',
        chainlinkRpc: 'https://rpc.ankr.com/eth',
        blockchain: 'ETHEREUM',
        erc20AbiName: 'ropstenErc20',
        tokens: 'tokensRopsten',

        chainlinkPriceAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
        forwarderContractAddress: '0x39C62b375e210D4dfEC3Cad2DC15B41174A4E573',
        // for initing erc20 contract
        nativeAddress: '0xc778417E063141139Fce010982780140Aa0cD5Ab',
        defaultActiveToken: '0xf5507fca73a3804e785ee2648922d76910327c32', // dai
    },
    rinkeby: {
        api: 'https://api.rarible.org/v0.1',
        chainlinkRpc: 'https://rpc.ankr.com/eth',
        blockchain: 'ETHEREUM',
        erc20AbiName: 'rinkebyErc20',
        tokens: 'tokensRinkeby',

        chainlinkPriceAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
        forwarderContractAddress: '0x39C62b375e210D4dfEC3Cad2DC15B41174A4E573',
        nativeAddress: '0xDf032Bc4B9dC2782Bb09352007D4C57B75160B15',
        defaultActiveToken: '0x0165b733e860b1674541BB7409f8a4743A564157', // dai
    },
    polygon_mainnet: {
        api: 'https://api.rarible.org/v0.1',
        chainlinkRpc: 'https://rpc.ankr.com/polygon',
        blockchain: 'POLYGON',
        erc20AbiName: 'polygonErc20',
        tokens: 'tokensPolygon',

        chainlinkPriceAddress: '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0',
        QRCheckAddress: '0x3bf7c7e05fae0e3dc7071a53629bf6c49c05c6e8',
        nativeAddress: '0x0000000000000000000000000000000000001010',
        defaultActiveToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // usdc
    }
}

export function getProvider(provider) {
    return new ethers.providers.Web3Provider(provider, "any")
}

export const ConnectorTypes = {
    RARIBLE: 'rarible',
}


/*
* Bridge to vue store pinia
* */

export const AppStorage = {
    _store: null,

    getStore(){
        if(!this._store) this._store = useStore();
        return this._store
    },
}

export function getNameByChainID(chainID){
    const [name] = Object.entries(networks).find(([, data]) => data.chainId === chainID) || ['unknown']
    let isSupport = (name !== 'unknown')? !!+process.env[`VUE_APP_NETWORK_${name.toUpperCase()}_SUPPORT`] : false

    return isSupport? name : 'unknown'
}

export function getData(networkName){
    return networkName ? networks[networkName.toLowerCase()] : null
}

export function getSettings(networkName){
    return networkName ? settings[networkName.toLowerCase()] : null
}