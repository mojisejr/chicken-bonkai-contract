import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("LaunchPad Tests", async () => {
  async function deploy() {
    const nftLauFac = await ethers.getContractFactory("ChickenDAOBonkai");
    const nftFac = await ethers.getContractFactory("ChickenDAOBonkaiNFT");

    const [owner, admin, minter1, minter2, treasury, dev] =
      await ethers.getSigners();

    const nftLau = await nftLauFac.deploy(treasury.address, dev.address);
    await nftLau.deployed();

    // uint256 _supply,
    // address _admin,
    // address _owner,
    // address _treasury,
    // string memory _name,
    // string memory _symbol,
    // address[] memory _payees,
    // uint256[] memory _shares

    const nft1 = await nftFac.deploy(
      1000,
      nftLau.address,
      owner.address,
      treasury.address,
      "SoomKaiNFT",
      "SCIK",
      [owner.address, treasury.address, dev.address],
      [80, 10, 10]
    );

    await nft1.deployed();
    await nftLau.addNewNFT(nft1.address, owner.address);

    const nft2 = await nftFac.deploy(
      3000,
      nftLau.address,
      owner.address,
      treasury.address,
      "BITKUB-BITKAO",
      "BITKAO",
      [owner.address, treasury.address, admin.address],
      [90, 5, 5]
    );

    await nft2.deployed();
    await nftLau.addNewNFT(nft2.address, owner.address);

    return { nftLau, nft1, nft2 };
  }

  it("Deployment", async () => {
    const { nftLau, nft1, nft2 } = await deploy();
    const nfta = await nftLau.getNFTByAddress(nft1.address);
    const nftb = await nftLau.getNFTByAddress(nft2.address);
    const nftall = await nftLau.getAllNfts();
    const nftAddresses = await nftLau.getNFTAddresses();
    console.log({ nfta, nftb });

    console.log("all ,", nftall);
    console.log("addresslist, ", nftAddresses);
    // const nfts = await nftLau.getAllNfts();

    // console.log("nft: ", nfts);
  });
});
