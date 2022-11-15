// -------------------IMPORTS------------------- //
let Web3 = require('web3'); // Add the web3 node package
let ethUtil = require('ethereumjs-util'); // 'ethereumjs-util' is a collection of utility functions for Ethereum
let sigUtil  = require('eth-sig-util'); // 'eth-sig-util' is a small collection of Ethereum signing functions
const config = require('./data-config.json'); // Include the network-specific configurations
const contractAbi = require('./ABI/Forwarder.json'); // Import the contract ABI of the smart contract
const BigNumber = require('bignumber.js'); // Add the bignumber.js node package
const { EIP712Domain } = require('./helper.js'); // Add some helpers

async function main() {
    // === DEPLOY ===
    // Forwarder
    const config = {
        "name": "AwlForwarder",
        "version": "1",
    }
    const Forwarder = await hre.ethers.getContractFactory("Forwarder");
    const forwarder = await Forwarder.deploy(config.name, config.version);

    await forwarder.deployed();

    console.log("Forwarder:", forwarder.address);

    // ERC20 token
    const ERC20 = await hre.ethers.getContractFactory("ERC20");
    const erc20 = await ERC20.deploy(config.name, config.version);

    await erc20.deployed();

    console.log("ERC20:", erc20.address);

    // === SIGNATURE ===
    const accounts = await hre.ethers.getSigners();

    const web3 = new Web3(`http://127.0.0.1:8545/`);

    // const forwarderContract = new web3.eth.Contract(forwarder.abi, forwarder.address); // Initiate the web3 contract object

    const owner = accounts[0].address;
    const to = accounts[1].address; // wallet
    const token = erc20.address // token
    const gas = 21000000 // gas
    const name = "AwlForwarder"
    const version = "1"
    const chainId = 31100
    const value = 100;
    const privateKey = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

    let tokenValue = new BigNumber(1 ** 18);
    let fnSignatureTransfer = web3.utils.keccak256('transferFrom(address,address,uint256)').substr(0, 10);

    // Encode the function parameters
    let fnParamsTransfer = web3.eth.abi.encodeParameters(
        ['address', 'address', 'uint256'],
        [owner, to, tokenValue]
    );
    data = fnSignatureTransfer + fnParamsTransfer.substr(2);
    data = '0x'

    // Setting the nonce needed for the signature (replay protection)
    const nonce = Number(await forwarder.functions.getNonce(owner));

    // -------------------FORWARDREQUEST PARAMETERS------------------- //
    // Defining the general ForwardRequest struct
    const ForwardRequest = [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'data', type: 'bytes' },
    ];

    // Defining the ForwardRequest data struct values as function of `verifyingContract` address 
    const buildData = (verifyingContract) => ({
        primaryType: 'ForwardRequest',
        types: { EIP712Domain, ForwardRequest },
        domain: { name, version, chainId, verifyingContract },
        message: { from: owner, to, value, gas, nonce, data },
    });

    const forwardRequest = buildData(forwarder.address); // Build the final data struct

    // -------------------SIGNATURE------------------- //
    const signature = sigUtil.signTypedData_v4(
        Buffer.from(privateKey, 'hex'),
        { data: forwardRequest }
        ); // Generate the signature
    
    console.assert(ethUtil.toChecksumAddress(owner) == ethUtil.toChecksumAddress(sigUtil.recoverTypedSignature_v4({data: forwardRequest, sig: signature}))); // Assert that the `owner` is equal to the `signer`
    console.log('----------------------------------------------','\n');

    // -------------------INPUT PARAMETERS FOR EXECUTE TRANSACTION------------------- //
    // console.log('payableAmount (ether): ' + value, '\n');
    // console.log('req (tuple): ' + '[' + '"' + owner + '"' + ', ' + '"' + to + '"' + ', ' + '"' + value + '"' +
    // ', ' + '"' + gas + '"' + ', ' + '"' + nonce + '"' + ', ' + '"' + data + '"' + ']', '\n');
    // console.log('signature (bytes): ' + signature, '\n');

    // // -------------------DECODE INPUT PARAMETERS FROM CALLDATA FOR TESTING------------------- //
    // const decodedParams = web3.eth.abi.decodeParameters(['address', 'address', 'uint256'], '0x' + data.substr(10));
    // console.assert(decodedParams[0] == ethUtil.toChecksumAddress(owner) && decodedParams[1] == ethUtil.toChecksumAddress(to) && decodedParams[2] == tokenValue);

    // -------------------EXECUTE TRANSACTION------------------- //

    // const a = await forwarder.addSenderToWhitelist(accounts[0].address)
    // console.log(a);

    // console.log(forwardRequest.message, signature)
    // const res = await forwarder.functions.verify(forwardRequest.message, signature);

    // console.log(res);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
  