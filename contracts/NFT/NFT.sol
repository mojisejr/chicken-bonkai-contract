//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ERC721A/extensions/ERC721AQueryable.sol";

contract ChickenDAOBonkaiNFT is ERC721AQueryable, AccessControl, ReentrancyGuard {

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
        TYPE mintType;
        NFT[] nfts; //need these nfts to be able to mint
        Wallet[] wallets; //only these wallets will be able to mint
        ERC20[] tokens; //only these token could be mint
    }

    enum TYPE {
        NFT,
        WALLET,
        ERC20
    }

    struct NFT {
        address nft;
        uint256 maxMint;
        uint256 count;
    }

    struct Wallet {
        address wallet;
        uint256 maxMint;
        uint256 count;
    }

    struct ERC20 {
        IERC20 erc20;
        uint256 maxMint;
        uint256 count;
    }

    // GOLBAL STATE
    bool pause = false;
    bool frozenMetadata = false;

    // ROUND DATA
    uint8 nextRound = 1;
    uint256 totalAllowance = 0;
    mapping(uint8 => Round) round;
    mapping(uint8 => uint256) roundToTotalMinted;

    // CONSTANTS
    uint256 START_TOKEN_ID = 1;
    uint256 MAX_SUPPLY; 
 
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
        uint256 _allowance,
        NFT[] calldata _nfts,
        Wallet[] calldata _wallets,
        ERC20[] calldata _erc20
    ) external onlyRole(ADMIN_ROLE) nonReentrant{
        round[nextRound].name = _name;
        round[nextRound].desc = _desc;
        round[nextRound].mintPrice = _mintPrice;
        round[nextRound].start = _start;
        round[nextRound].end = _end;
        round[nextRound].paused = false; 
        round[nextRound].allowance =  _allowance;
        round[nextRound].nfts = _nfts;
        round[nextRound].wallets = _wallets;
        round[nextRound].tokens = _erc20;
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

    // Public Functions
    ///////////////////

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721A, IERC721A, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function getCurrentRound() public view returns(uint8) {
        return nextRound - 1;
    }

    function getType(uint8 _roundId) public view returns(TYPE) {
        return round[_roundId].mintType;
    }

    function mint(uint256 _amount) public payable {
        uint8 currentRound = getCurrentRound();
        TYPE t = getType(currentRound);
        require(!round[currentRound].paused, 'MINT : round is paused.');
        require(round[currentRound].allowance < roundToTotalMinted[currentRound], 'MINT : this round has been minted out.'); 
        require(round[currentRound].start < block.timestamp, 'MINT : mitning not yet start.');
        require(round[currentRound].end > block.timestamp, 'MINT : minting is ended.');
        require(round[currentRound].mintPrice * _amount == msg.value, 'MINT : invalid minting price');

        if(t == TYPE.NFT) {
            //MINT with NFT
        } else if (t == TYPE.WALLET) {
            //MINT with wallet
        } else if (t == TYPE.ERC20) {
            //MINT with erc20
        }

        _mint(msg.sender, _amount);
    }



    // Internal Functions
    //////////////////////

    function _startTokenId() internal view virtual override returns(uint256) {
        return START_TOKEN_ID;
    }

    function _increaseRound() internal {
        ++nextRound;
    } 

    function _increaseTotalAllowance(uint256 _allowance) internal {
        totalAllowance += _allowance;
    }
}

