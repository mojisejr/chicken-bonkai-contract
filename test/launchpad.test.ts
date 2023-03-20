import { expect } from "chai";
import { ethers } from "hardhat";

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

  it("1. should be able to get individual nft structure", async () => {
    const { nftLau, nft1, nft2 } = await deploy();
    const nfta = await nftLau.getNFTByAddress(nft1.address);

    expect(nfta.asset).to.be.equal(nft1.address);
  });

  it("2. should be able to get all addedNFT", async () => {
    const { nftLau, nft1, nft2 } = await deploy();
    const allNfts = await nftLau.getAllNfts();

    expect(allNfts[0].asset).to.be.equal(nft1.address);
    expect(allNfts[1].asset).to.be.equal(nft2.address);
  });

  it("3. should be able to set active / inactive to the specific smart contract", async () => {
    const { nftLau, nft1 } = await deploy();

    await nftLau.setActive(nft1.address, false);

    const result = await nft1.isPaused();

    expect(result).to.be.false;
  });

  it("4. should be output the correct totalNFT in the launch pad", async () => {
    const { nftLau } = await deploy();

    const minted = await nftLau.totalNft();

    expect(minted.toString()).to.be.equal("2");
  });

  it("5. getAllNfts() should be output empty array if has no nft", async () => {
    const nftLauFac = await ethers.getContractFactory("ChickenDAOBonkai");

    const [owner, admin, minter1, minter2, treasury, dev] =
      await ethers.getSigners();

    const nftLau = await nftLauFac.deploy(treasury.address, dev.address);
    await nftLau.deployed();

    const nft = await nftLau.getAllNfts();

    console.log("nft: ", nft);
  });
});
