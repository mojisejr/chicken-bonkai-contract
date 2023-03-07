//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "https://github.com/chiru-labs/ERC721A/blob/main/contracts/extensions/ERC721AQueryable.sol";

contract ChickenDAOBonkaiNFT is ERC721AQueryable, AccessControl, ReentrancyGuard {

    using Strings for uint256;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant NFT_OWNER_ROLE = keccak256("NFT_OWNER_ROLE");

    struct Round {
        string name;
        string desc;
        uint256 mintPrice;
        uint256 start;
        uint256 end;
        uint256 allowance; //total nft allowcation for this round
        bool paused;
        uint256 maxMintPerRound;
        uint256 maxMintPerTx;
        TYPE mintType;
        address asset;
        uint256 assetRequired;
        uint256 totalMinted;
    }

    enum TYPE {
        PUBLIC,
        NFT,
        WALLET,
        ERC20
    }

    // GOLBAL STATE
    bool pause = false;
    bool frozenMetadata = false;

    // ROUND DATA
    uint8 nextRound = 1;
    uint256 totalAllowance = 0;
    mapping(uint8 => Round) round;
    mapping(uint8 => mapping(address => uint256)) roundToAddressMintedAmount;
    mapping(uint8 => bytes32) roundToHash; 

    // CONSTANTS
    uint256 START_TOKEN_ID = 1;
    uint256 MAX_SUPPLY; 
    string BASE_URI;
    string NOT_FOUND_URI = "LAUNCH PAD URI FAILED URI";

    // Consturctor
    ///////////////

    constructor(
        uint256 _supply, 
        address _admin, 
        address _owner,
        string memory _name,
        string memory _symbol
    ) ERC721A(_name, _symbol) {  
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); 
        _setupRole(ADMIN_ROLE, _admin);
        _setupRole(NFT_OWNER_ROLE, _owner);
        MAX_SUPPLY = _supply;
    } 

    // Admin Functions
    /////////////////

    function createNewRound(
        string memory _name,
        string memory _desc,
        uint256 _mintPrice,
        uint256 _start,
        uint256 _end,
        uint256 _maxMintPerRound,
        uint256 _maxMintPerTx,
        TYPE _mintType,
        uint256 _allowance,
        address _assetAddress,
        uint256 _assetRequired
    ) external onlyRole(ADMIN_ROLE) nonReentrant{
        round[nextRound].name = _name;
        round[nextRound].desc = _desc;
        round[nextRound].mintPrice = _mintPrice;
        round[nextRound].start = _start;
        round[nextRound].end = _end;
        round[nextRound].maxMintPerRound = _maxMintPerRound;
        round[nextRound].maxMintPerTx = _maxMintPerTx;
        round[nextRound].mintType = _mintType;
        round[nextRound].paused = false; 
        round[nextRound].allowance =  _allowance;
        round[nextRound].asset = _assetAddress;
        round[nextRound].assetRequired = _assetRequired;
        _increaseRound();
    }

    function setMintPrice(
        uint8 _roundId, 
        uint256 _newPrice
    ) external onlyRole(ADMIN_ROLE) {
        require(round[_roundId].paused, "SET_MINT_PRICE : need to pause this round before set new price.");
        require(round[_roundId].start > block.timestamp, "SET_MINT_PRICE : could not set price after mint round get started!");
        round[_roundId].mintPrice = _newPrice;
    }

    function setAllowance(
        uint8 _roundId, 
        uint256 _allowance
    ) external onlyRole(ADMIN_ROLE) {
        require(_allowance < MAX_SUPPLY, 'SET_ALLOWANCE : invalid allowance.');
        require((_allowance + totalAllowance) < MAX_SUPPLY, "SET_ALLOWANCE : cannot set allowance more than max supply.");
        require(round[_roundId].start > block.timestamp, 'SET_ALLOWANCE : this round is started.');
        round[_roundId].allowance = _allowance; 
    }

    function pauseRound(uint8 _roundId) external onlyRole(ADMIN_ROLE) {
        round[_roundId].paused = true;
    }

    function unPauseRound(uint8 _roundId) external onlyRole(ADMIN_ROLE) {
        round[_roundId].paused = false;
    }

    function setBaseUri(string memory _baseURI) external onlyRole(ADMIN_ROLE) {
        require(!frozenMetadata, 'SET_BASE_URI : metadata has been frozen');
        BASE_URI = _baseURI;
    }

    function setNotFoundUri(string memory _uri) external onlyRole(ADMIN_ROLE) {
        require(!frozenMetadata, 'SET_NOT_FOUND : metadata has been frozen');
        NOT_FOUND_URI = _uri;
    }


    // Public Functions
    ///////////////////

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721A, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function getCurrentRound() public view returns(uint8) {
        return nextRound - 1;
    }

    function getRoundInfo(uint8 _roundId) public view returns(Round memory) {
        return round[_roundId];
    }

    function getType(uint8 _roundId) public view returns(TYPE) {
        return round[_roundId].mintType;
    }

    function mint(uint256 _amount) public payable {
        uint8 currentRound = getCurrentRound();
        TYPE t = getType(currentRound);
        require(!frozenMetadata, "MINT : cannot mint anymore.");
        require(!round[currentRound].paused, 'MINT : round is paused.');
        require(round[currentRound].allowance > round[currentRound].totalMinted, 'MINT : this round has been minted out.'); 
        require(round[currentRound].start < block.timestamp, 'MINT : mitning not yet start.');
        require(round[currentRound].end > block.timestamp, 'MINT : minting is ended.');
        require(round[currentRound].mintPrice * _amount == msg.value, 'MINT : invalid minting price');

        if(MAX_SUPPLY > 0) {
            require(totalSupply() < MAX_SUPPLY, 'MINT : totalSupply reached.');
        }

        if(t == TYPE.PUBLIC) { 
           _mintPublic(currentRound, _amount); 
        } else if(t == TYPE.NFT) {
            _mintWithNFT(currentRound, _amount);
        } else if (t == TYPE.WALLET) {
        } else if (t == TYPE.ERC20) {
            _mintWithToken(currentRound, _amount);
        }

        _mint(msg.sender, _amount);
    }

    function tokenURI(uint256 _tokenId) public view override returns(string memory) {
        if (!_exists(_tokenId)) revert URIQueryForNonexistentToken(); 
        string memory uri = string(abi.encodePacked(BASE_URI,_tokenId.toString(),'.json'));
        return bytes(uri).length > 0 ? uri : NOT_FOUND_URI;
    }
    // Internal Functions
    //////////////////////
    function _mintPublic(uint8 _currentRound, uint256 _amount) public {
            _mint(msg.sender, _amount);
            _increaseTotalAllowance(_amount);
            _increaseRoundTotalMinted(_currentRound, _amount);
            _increaseRoundToAddressMintedAmount(_currentRound, _amount);
    }

    function _mintWithNFT(uint8 _currentRound, uint256 _amount) public {
            require(IERC721(round[_currentRound].asset).balanceOf(msg.sender) > round[_currentRound].assetRequired, 'amount of nft not exceed required amount');
            _mint(msg.sender, _amount);
            _increaseTotalAllowance(_amount);
            _increaseRoundTotalMinted(_currentRound, _amount);
            _increaseRoundToAddressMintedAmount(_currentRound, _amount);
    }

    function _mintWithToken(uint8 _currentRound, uint256 _amount) public {
            uint256 totalAmount = round[_currentRound].assetRequired * _amount;
            require(IERC20(round[_currentRound].asset).balanceOf(msg.sender) >= totalAmount, 'amount of token not exceed required amount'); 
            
            //transfer token needed to contract
            IERC20(round[_currentRound].asset).transferFrom(msg.sender, address(this), totalAmount);
            _mint(msg.sender, _amount);
            _increaseTotalAllowance(_amount);
            _increaseRoundTotalMinted(_currentRound, _amount);
            _increaseRoundToAddressMintedAmount(_currentRound, _amount);
    }

    function _startTokenId() internal view virtual override returns(uint256) {
        return START_TOKEN_ID;
    }

    function _increaseRound() internal {
        ++nextRound;
    } 

    function _increaseTotalAllowance(uint256 _allowance) internal {
        totalAllowance += _allowance;
    }

    function _increaseRoundTotalMinted(uint8 _roundId, uint256 _amount) internal {
        round[_roundId].totalMinted += _amount;
    }

    function _increaseRoundToAddressMintedAmount(uint8 _roundId, uint256 _amount) internal {
        roundToAddressMintedAmount[_roundId][msg.sender] += _amount;
    }
}
