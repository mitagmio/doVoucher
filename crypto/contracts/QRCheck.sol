// SPDX-License-Identifier: MIT
// Further information: https://eips.ethereum.org/EIPS/eip-2770
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-IERC20Permit.sol";


interface IDeBridgeGate {
    /* ========== STRUCTS ========== */
    struct SubmissionAutoParamsTo {
        uint256 executionFee;
        uint256 flags;
        bytes fallbackAddress;
        bytes data;
    }

    function send(
        address _tokenAddress,
        uint256 _amount,
        uint256 _chainIdTo,
        bytes memory _receiver,
        bytes memory _permit,
        bool _useAssetFee,
        uint32 _referralCode,
        bytes calldata _autoParams
    ) external payable;

}

contract QRCheck is Ownable, EIP712 {
    using ECDSA for bytes32;

    struct ForwardRequest {
        address from;       // Externally-owned account (EOA) making the request.
        address bridge;   // Bridge
        address receiver; // Receiver
        address token;   // Token
        uint256 valueFromSender;   //
        uint256 valueToReceiver;   //
        uint256 nonce;      // On-chain tracked nonce of a transaction.
        uint256 toChainId;
    }

    struct CheckRequest {
        address from;       // Externally-owned account (EOA) making the request.
        address executor;   // Bridge
        address token;   // Token
        uint256 amount;   //
        uint256 nonce;   //
        uint256 fromChainId;      // On-chain tracked nonce of a transaction.
    }

    struct CheckRequestNFT {
        address from;       // Externally-owned account (EOA) making the request.
        address executor;   // Bridge
        address contractAddress;   //
        uint256 tokenId;   // Token
        uint256 nonce;   //
        uint256 fromChainId;      // On-chain tracked nonce of a transaction.
    }

    struct Permit {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;        
    }

    struct DeBridge{
        bytes data;
        uint256 executionFee;
        address receiver;
        bytes permit;
        bool useAssetFee;
        uint32 referralCode;
    }

    bytes32 private constant _TYPEHASH = keccak256("doPayRequest(address from,address bridge,address receiver,address token,uint256 valueFromSender,uint256 valueToReceiver,uint256 nonce,uint256 toChainId)");
    bytes32 private constant _TYPEHASHCheck = keccak256("checkRequest(address from,address executor,address token,uint256 amount,uint256 nonce,uint256 fromChainId)");
    bytes32 private constant _TYPEHASHCheckNFT = keccak256("checkRequestNFT(address from,address executor,address contractAddress,uint256 tokenId,uint256 nonce,uint256 fromChainId)");


    bytes4 private constant _transferFrom = bytes4(keccak256("transferFrom(address,address,uint256)"));
    bytes4 private constant _transfer = bytes4(keccak256("transfer(address,uint256)"));
    string _name;
    string _version;
    address deBridge_address;

    bytes private autoParams_;


    mapping(address => uint256) private _nonces;
    mapping(address => bool) private _senderWhitelist;

    event MetaTransferCrossChain(address indexed from, 
                          address indexed to, 
                          uint256 indexed destinationChainId, 
                          uint256 value, 
                          string receipt);

    constructor(address deBridgeAddress, string memory name_, string memory version) EIP712(name_, version) {
        deBridge_address = deBridgeAddress;
        _name = name_;
        _version = version;
        address msgSender = msg.sender;
        addSenderToWhitelist(msgSender);
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function getNonce(address from) public view returns (uint256) {
        return _nonces[from];
    }

    function verify(ForwardRequest memory req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(keccak256(abi.encode(
            _TYPEHASH,
            req.from,
            req.bridge,
            req.receiver,
            req.token,
            req.valueFromSender,
            req.valueToReceiver,
            req.nonce,
            req.toChainId
        ))).recover(signature);

        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    function verifyCheck(CheckRequest memory req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(keccak256(abi.encode(
            _TYPEHASHCheck,
            req.from,
            req.executor,
            req.token,
            req.amount,
            req.nonce,
            req.fromChainId
        ))).recover(signature);

        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    function verifyCheckNFT(CheckRequestNFT memory req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(keccak256(abi.encode(
            _TYPEHASHCheckNFT,
            req.from,
            req.executor,
            req.contractAddress,
            req.tokenId,
            req.nonce,
            req.fromChainId
        ))).recover(signature);

        return _nonces[req.from] == req.nonce && signer == req.from;
    }

    function executeTransfer(ForwardRequest calldata req, 
                    bytes calldata signature,
                    string calldata receiptLink) public{
        require(_senderWhitelist[msg.sender], "Sender is not whitelisted");

        require(IERC20(req.token).balanceOf(req.from) >= req.valueFromSender, "Check balance. ERC20: transfer amount exceeds balance");

        require(verify(req, signature), "Signature does not match");

        _nonces[req.from] = req.nonce + 1;

        (bool success, ) = req.token.call{value: 0}
                            (abi.encodeWithSelector(
                            _transferFrom, 
                            req.from, 
                            address(this), 
                            req.valueFromSender));

        require(success, "Function transferFrom failed");

        (bool sent, ) = req.token.call{value: 0}
                            (abi.encodeWithSelector(
                            _transfer, 
                            req.receiver, 
                            req.valueToReceiver));

        require(sent, "Function transfer failed");

        emit MetaTransferCrossChain(req.from, 
                                    req.receiver, 
                                    req.toChainId, 
                                    req.valueToReceiver, 
                                    receiptLink);

    }

    function executeCheckNFT(CheckRequestNFT calldata req,
                    bytes calldata signature,
                    address receiver) public{
        require(_senderWhitelist[msg.sender], "Sender is not whitelisted");

        require(IERC721(req.contractAddress).balanceOf(req.from) >= 1, "Check balance. ERC721: transfer amount exceeds balance");

        require(verifyCheckNFT(req, signature), "Signature does not match");

        _nonces[req.from] = req.nonce + 1;

        (bool success, ) = req.contractAddress.call{value: 0}
                            (abi.encodeWithSelector(
                            _transferFrom, 
                            req.from, 
                            receiver, 
                            req.tokenId));

        require(success, "Function transferFrom failed");
        

        // emit MetaTransferCrossChain(req.from, 
        //                             req.receiver, 
        //                             req.toChainId, 
        //                             req.valueToReceiver, 
        //                             receiptLink);

    }

    function executeCheck(CheckRequest calldata req,
                    bytes calldata signature,
                    address receiver) public{
        require(_senderWhitelist[msg.sender], "Sender is not whitelisted");

        require(IERC20(req.token).balanceOf(req.from) >= req.amount, "Check balance. ERC20: transfer amount exceeds balance");

        require(verifyCheck(req, signature), "Signature does not match");

        _nonces[req.from] = req.nonce + 1;

        (bool success, ) = req.token.call{value: 0}
                            (abi.encodeWithSelector(
                            _transferFrom, 
                            req.from, 
                            req.executor, 
                            req.amount));

        require(success, "Function transferFrom failed");

        (bool sent, ) = req.token.call{value: 0}
                            (abi.encodeWithSelector(
                            _transfer, 
                            receiver, 
                            req.amount));

        require(sent, "Function transfer failed");

        // emit MetaTransferCrossChain(req.from, 
        //                             req.receiver, 
        //                             req.toChainId, 
        //                             req.valueToReceiver, 
        //                             receiptLink);

    }

    function executeCheckPermit(CheckRequest calldata req, 
                    Permit calldata permitMessage,
                    bytes calldata signature,
                    address receiver) public{
        require(_senderWhitelist[msg.sender], "Sender is not whitelisted");

        require(IERC20(req.token).balanceOf(req.from) >= req.amount, "Check balance. ERC20: transfer amount exceeds balance");

        require(verifyCheck(req, signature), "Signature does not match");

        _nonces[req.from] = req.nonce + 1;

        sendPermit(permitMessage, req.token);

        (bool success, ) = req.token.call{value: 0}
                            (abi.encodeWithSelector(
                            _transferFrom, 
                            req.from, 
                            req.executor, 
                            req.amount));

        require(success, "Function transferFrom failed");

        (bool sent, ) = req.token.call{value: 0}
                            (abi.encodeWithSelector(
                            _transfer, 
                            receiver, 
                            req.amount));

        require(sent, "Function transfer failed");

        // emit MetaTransferCrossChain(req.from, 
        //                             req.receiver, 
        //                             req.toChainId, 
        //                             req.valueToReceiver, 
        //                             receiptLink);

    }


    function toBytes(address addr) public pure returns (bytes memory) {
        return abi.encodePacked(addr);
    }

    function sendPermit(Permit calldata _permit, address token) internal {
        IERC20Permit(token).permit(_permit.owner, _permit.spender, _permit.value, _permit.deadline, _permit.v, _permit.r, _permit.s);
    }

    function sendArrove(address token, address approveAddress, uint256 value) public onlyOwner {
        IERC20(token).approve(approveAddress, value);
    }

    function addSenderToWhitelist(address sender) public onlyOwner() {
        require(!isWhitelisted(sender), "Sender address is already whitelisted"); 
        _senderWhitelist[sender] = true;
    }

    function removeSenderFromWhitelist(address sender) public onlyOwner() {
        _senderWhitelist[sender] = false;
    }

    function isWhitelisted(address sender) public view returns (bool) {
        return _senderWhitelist[sender];
    }

    function name() public view returns (string memory) {
        return _name;
    }

    function version() public view returns (string memory) {
        return _version;
    }

    function getFunds(address token, address receiver) public onlyOwner() {
        uint256 balance = IERC20(token).balanceOf(address(this));

        (bool success, ) = token.call{value: 0}
                            (abi.encodeWithSelector(
                            _transfer, 
                            receiver, 
                            balance));
    }
}
