import POLYGON from './ERC20Native/POLYGON.json'
import RINKEBY from './ERC20Native/RINKEBY.json'
import ROPSTEN from './ERC20Native/ROPSTEN.json'
import MAINNET from './ERC20Native/MAINNET.json'
import ChainLinkABI from './ChainLinkABI.json'
import doPayABI from './doPayABI.json'
import DebridgeABI from './DebridgeABI.json'
import QRCheckABI from './QRCheckABI.json'
import ERC721ABI from './ERC721ABI.json'
import usdc_polygon from './ERC20Tokens/usdc_polygon.json'
import usdc_ethereum from './ERC20Tokens/usdc_ethereum.json'

export default {
    default: {
        ABI: RINKEBY
    },
    // native erc20 (wmatic, weth...)
    polygonErc20: {
        ABI: POLYGON
    },
    rinkebyErc20: {
        ABI: RINKEBY
    },
    ropstenErc20: {
        ABI: ROPSTEN
    },
    mainnetErc20: {
        ABI: MAINNET
    },
    // stablecoins contracts
    usdc_polygon: {
        ABI: usdc_polygon
    },
    usdc_ethereum: {
        ABI: usdc_ethereum
    },
    // other
    DebridgeContract: {
        ABI: DebridgeABI
    },
    doPayContract: {
        ABI: doPayABI
    },
    ERC721Contract: {
        ABI: ERC721ABI
    },
    QRCheckContract: {
        ABI: QRCheckABI
    },
    ChainLinkABI: {
        ABI: ChainLinkABI
    },
}