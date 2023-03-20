//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

interface IChickenDAOBonkaiNFT {
    function setPause(bool _value) external;
}

contract ChickenDAOBonkai is AccessControl {

  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");


    struct Round {
        string name;
        string desc;
        uint256 mintPrice;
        uint256 start;
        uint256 end;
        uint256 allowance; //total nft allowcation for this round
        bool paused;
        uint256 maxMintPerTx;
        TYPE mintType;
        address asset;
        uint256 assetRequired;
        uint256 totalMinted;
    }

  struct NFT {
    address asset;
    address owner;
    bool active;
    bool added;
    uint256 addedAt;
    mapping(uint8 => Round) rounds;
  }

    enum TYPE {
        PUBLIC,
        NFT,
        WALLET,
        ERC20
    }


  bool paused = false;
 

  mapping(address => NFT) nft;

  address[] nftAddresses;
  uint256 nftCount;

  address TREASURY_ADDR;
  address DEV_ADDR;

  constructor(
    address _treasury,
    address _dev
  ) {
    _setupRole(ADMIN_ROLE, msg.sender);
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    TREASURY_ADDR = _treasury;
    DEV_ADDR = _dev;
  }

  //NFT MANAGEMENT
  ////////////////

  function addNewNFT(address _nft, address _owner) public onlyRole(ADMIN_ROLE) {
    require(!nft[_nft].added, 'ADD_NEW_NFT : this address has been added.');
    nft[_nft].owner = _owner; 
    nft[_nft].asset = _nft;
    nft[_nft].active = true;
    nft[_nft].added = true;
    nft[_nft].addedAt = block.timestamp;
    nftAddresses.push(_nft);
    _increaseNft();
  }

  //SETTER
  /////////

  function setActive(address _nft, bool _value) public onlyRole(ADMIN_ROLE) {
    require(nft[_nft].added, 'SET_ACTIVE : invalid nft address');
    IChickenDAOBonkaiNFT(_nft).setPause(_value);
    nft[_nft].active = _value;
  }

  function setPause(bool _value) public onlyRole(ADMIN_ROLE) {
    paused = _value;
  }

  // GETTER
  ///////////

  function getAllNfts() public view returns(NFT[] memory) {
    NFT[] memory nfts = new NFT[](nftCount);
    for(uint256 i = 0; i < nftCount; i ++) {
      nfts[i] = nft[nftAddresses[i]];
    }
    return nfts;
  }

  function isActive(address _nft) public view returns(bool) {
    return nft[_nft].active;
  }

  function isAdded(address _nft) public view returns(bool) {
    return nft[_nft].added;
  }

  function isPaused() public view returns(bool) {
    return paused;
  }

  function getNFTAddresses() public view returns(address[] memory) {
    return nftAddresses;
  }

  function getNFTByAddress(address _nft) external view returns(NFT memory) {
    return nft[_nft];
  }

  function _increaseNft() internal {
    nftCount += 1;
  } 

  function totalNft() external view returns(uint256) {
    return nftCount;
  }
}