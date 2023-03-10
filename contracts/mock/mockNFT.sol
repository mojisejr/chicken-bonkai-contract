//SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/Strings.sol";
// import "https://github.com/chiru-labs/ERC721A/blob/main/contracts/extensions/ERC721AQueryable.sol";
import "../ERC721A/extensions/ERC721AQueryable.sol";

contract MockNFT is ERC721AQueryable {

    using Strings for uint256;

    constructor() ERC721A("MOCK", "MK") {}

    function mint(uint256 _amount) public {
      _mint(msg.sender, _amount);
    }

}
