//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";
// import "https://github.com/chiru-labs/ERC721A/blob/main/contracts/extensions/ERC721AQueryable.sol";
import "../../ERC721A/extensions/ERC721AQueryable.sol";

contract ChickenDAOBonkaiNFT is ERC721AQueryable, AccessControl, ReentrancyGuard, PaymentSplitter {

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
    bool paused = false;
    bool frozenMetadata = false;

    // ROUND DATA
    uint256 totalAllowance = 0;
    uint8 roundCount = 1;
    uint8 activeRound = 1;
    mapping(uint8 => Round) round;
    mapping(uint8 => mapping(address => uint256)) roundToAddressMintedAmount;
    mapping(uint8 => bytes32) roundToHash; 

    // CONSTANTS
    uint256 START_TOKEN_ID = 1;
    uint256 MAX_SUPPLY; 
    uint256 MAX_MINT_PER_WALLET = 2;
    string BASE_URI;
    string NOT_FOUND_URI = "LAUNCH PAD URI FAILED URI";

    address CHICKEN_DAO_TREASURY;
    address CHICKEN_DAO_DEV; 
    address NFT_OWNER;

    // Consturctor
    ///////////////

    constructor(
        uint256 _supply, 
        address _admin, 
        address _owner,
        address _treasury,
        string memory _name,
        string memory _symbol,
        address[] memory _payees,
        uint256[] memory _shares
    ) ERC721A(_name, _symbol) PaymentSplitter(_payees, _shares) {  
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender); 
        _setupRole(ADMIN_ROLE, _admin);
        _setupRole(NFT_OWNER_ROLE, _owner);
        CHICKEN_DAO_TREASURY = _treasury;
        CHICKEN_DAO_DEV = _admin;
        NFT_OWNER = _owner;
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
        uint256 _maxMintPerTx,
        TYPE _mintType,
        uint256 _allowance,
        address _assetAddress,
        uint256 _assetRequired
    ) external onlyRole(ADMIN_ROLE) nonReentrant{
        if(MAX_SUPPLY > 0) {
            require(_allowance < MAX_SUPPLY - totalAllowance + 1,'CREATE_NEW_ROUND : not enough space.');
        }
        require(_maxMintPerTx < _allowance, 'CREATE_NEW_ROUND : invalid max mint per tx amount.');
        round[roundCount].name = _name;
        round[roundCount].desc = _desc;
        round[roundCount].mintPrice = _mintPrice;
        round[roundCount].start = _start;
        round[roundCount].end = _end;
        round[roundCount].maxMintPerTx = _maxMintPerTx;
        round[roundCount].mintType = _mintType;
        round[roundCount].paused = false; 
        round[roundCount].allowance =  _allowance;
        round[roundCount].asset = _assetAddress;
        round[roundCount].assetRequired = _assetRequired;
        _increaseRound();
        _increaseTotalAllowance(_allowance);
    }

    function nextRound() external onlyRole(ADMIN_ROLE) nonReentrant {
        require(round[activeRound].end < block.timestamp, 'NEXT_ROUND : current round is still active');
        require(activeRound <= roundCount, 'NEXT_ROUND : this is the last available round');
        uint8 thisRound = getNextRound();
        require(round[thisRound].start < block.timestamp, "NEXT_ROUND : not the start time for this round");
        require(round[thisRound].end > block.timestamp, "NEXT_ROUND : cannot start the eneded round");
        require(!round[thisRound].paused, "NEXT_ROUND : this round was paused or ended");
        activeRound = thisRound;
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
        if(MAX_SUPPLY > 0) {
            require(_allowance < MAX_SUPPLY + 1, 'SET_ALLOWANCE : invalid allowance.');
        }
        require((_allowance + totalAllowance) < MAX_SUPPLY + 1, "SET_ALLOWANCE : cannot set allowance more than max supply.");
        require(round[_roundId].start > block.timestamp, 'SET_ALLOWANCE : this round is started.');
        round[_roundId].allowance = _allowance; 
    }

    function pauseRound(uint8 _roundId) external onlyRole(ADMIN_ROLE) {
        round[_roundId].paused = true;
    }

    function unPauseRound(uint8 _roundId) external onlyRole(ADMIN_ROLE) {
        round[_roundId].paused = false;
    }

    function setPause(bool _value) external onlyRole(ADMIN_ROLE) {
        paused = _value;
    }

    function setBaseUri(string memory _baseURI) external onlyRole(ADMIN_ROLE) {
        require(!frozenMetadata, 'SET_BASE_URI : metadata has been frozen');
        BASE_URI = _baseURI;
    }

    function setNotFoundUri(string memory _uri) external onlyRole(ADMIN_ROLE) {
        require(!frozenMetadata, 'SET_NOT_FOUND : metadata has been frozen');
        NOT_FOUND_URI = _uri;
    }

    function setTreasuryAddr(address _treasury) public onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), 'SET_TREASURY_ADDR : invalid address');
        CHICKEN_DAO_TREASURY = _treasury;
    }

    function setDevAddr(address _dev) public onlyRole(ADMIN_ROLE) {
        require(_dev != address(0), 'setDevAddr : invalid address');
        CHICKEN_DAO_DEV = _dev;
    }

    // WHITELIST
    /////////////

    function setRootHash(uint8 _roundId, bytes32 _hash) public onlyRole(ADMIN_ROLE) nonReentrant {
        roundToHash[_roundId] = _hash;
    }

    //Payment
    ////////////

    function withdrawKUB() public payable onlyRole(ADMIN_ROLE) nonReentrant {
        release(payable(NFT_OWNER));
        release(payable(CHICKEN_DAO_TREASURY));
        release(payable(CHICKEN_DAO_DEV));
    }

    function withdrawERC20(IERC20 _asset) public onlyRole(ADMIN_ROLE) nonReentrant {
        release(_asset, NFT_OWNER);
        release(_asset, CHICKEN_DAO_TREASURY);
        release(_asset, CHICKEN_DAO_DEV);
    }


    // Public Functions
    ///////////////////

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721A, IERC721A, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function getCurrentRound() public view returns(uint8) {
        return activeRound;
    }

    function getNextRound() public view returns(uint8) {
        return activeRound + 1;
    }

    function getRoundInfo(uint8 _roundId) public view returns(Round memory) {
        return round[_roundId];
    }

    function getAllRounds() public view returns(Round[] memory) {
        Round[] memory outputs = new Round[](roundCount);
        for(uint8 i = 0; i < roundCount; i++) {
            outputs[i] = round[i];
        }
        return outputs;
    }

    function getType(uint8 _roundId) public view returns(TYPE) {
        return round[_roundId].mintType;
    }

    function getERC20Balance(IERC20 _asset) public view returns(uint256) {
        return _asset.balanceOf(address(this));
    }

    function getBalance()  public view returns(uint256) {
        return address(this).balance;
    }

    function isPaused() public view returns(bool) {
        return paused;
    }

    // MINT FUNCTION 
    /////////////////

    function mint(uint256 _amount, bytes32[] memory data) public payable {
        require(!paused, 'MINT : this nft was paused.');
        if(MAX_SUPPLY > 0) {
            require(totalSupply() < MAX_SUPPLY, 'MINT : totalSupply reached.');
        }
        uint8 currentRound = getCurrentRound();
        TYPE t = getType(currentRound);
        require(!frozenMetadata, "MINT : cannot mint anymore.");
        require(round[currentRound].maxMintPerTx + 1 > _amount, 'MINT : invalid minting per tx');
        require(!round[currentRound].paused, 'MINT : round is paused.');
        require(round[currentRound].allowance > round[currentRound].totalMinted, 'MINT : this round has been minted out.'); 
        require(round[currentRound].start < block.timestamp, 'MINT : mitning not yet start.');
        require(round[currentRound].end > block.timestamp, 'MINT : minting is ended.');
        require(round[currentRound].mintPrice * _amount == msg.value, 'MINT : invalid minting price');


        if(t == TYPE.PUBLIC) { 
            _mintPublic(currentRound, _amount); 
        } else if(t == TYPE.NFT) {
            _mintWithNFT(currentRound, _amount);
        } else if (t == TYPE.WALLET) {
            _mintWithMerkle(currentRound, _amount, data);
        } else if (t == TYPE.ERC20) {
            _mintWithToken(currentRound, _amount);
        }
    }

    function tokenURI(uint256 _tokenId) public view override(ERC721A, IERC721A) returns(string memory) {
        if (!_exists(_tokenId)) revert URIQueryForNonexistentToken(); 
        string memory uri = string(abi.encodePacked(BASE_URI,_tokenId.toString(),'.json'));
        return bytes(uri).length > 0 ? uri : NOT_FOUND_URI;
    }

    // Internal Functions
    //////////////////////

    function _mintPublic(uint8 _currentRound, uint256 _amount) internal {
            _mint(msg.sender, _amount);
            _increaseRoundTotalMinted(_currentRound, _amount);
            _increaseRoundToAddressMintedAmount(_currentRound, _amount);
    }

    function _mintWithNFT(uint8 _currentRound, uint256 _amount) internal {
            require(IERC721(round[_currentRound].asset).balanceOf(msg.sender) >= round[_currentRound].assetRequired, 'MINT_WITH_NFT : amount of nft not exceed required amount');
            _mint(msg.sender, _amount);
            _increaseRoundTotalMinted(_currentRound, _amount);
            _increaseRoundToAddressMintedAmount(_currentRound, _amount);
    }

    function _mintWithToken(uint8 _currentRound, uint256 _amount) internal {
            uint256 totalAmount = round[_currentRound].assetRequired * _amount;
            require(IERC20(round[_currentRound].asset).balanceOf(msg.sender) >= totalAmount, 'MINT_WITH_TOKEN : amount of token not exceed required amount'); 
            
            //transfer token needed to contract
            IERC20(round[_currentRound].asset).transferFrom(msg.sender, address(this), totalAmount);
            _mint(msg.sender, _amount);
            _increaseRoundTotalMinted(_currentRound, _amount);
            _increaseRoundToAddressMintedAmount(_currentRound, _amount);
    }

    function _mintWithMerkle(uint8 _roundId, uint256 _amount, bytes32[] memory proofs) internal {
        require(proofs.length > 0, 'MINT_WITH_MERKLE : no proofs included');
        bytes32 signer = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProof.verify(proofs, roundToHash[_roundId], signer), 'MINT_WITH_MERKLE : this address is not in the whitelist');
        require(roundToAddressMintedAmount[_roundId][msg.sender] < MAX_MINT_PER_WALLET, "MINT_WITH_MERKLE : minting quota reached");

        _mint(msg.sender, _amount);
        _increaseRoundToAddressMintedAmount(_roundId, _amount);
        _increaseRoundTotalMinted(_roundId, _amount);
    }

    function _startTokenId() internal view virtual override returns(uint256) {
        return START_TOKEN_ID;
    }

    function _increaseRound() internal {
        ++roundCount;
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
