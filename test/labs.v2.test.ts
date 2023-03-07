import { expect } from "chai";
import { ethers } from "hardhat";
import { getExpectedContractAddress } from "../utils/getExpectedContractAddress";

describe("Labs Tests", async () => {
  async function deploy() {
    const hostFac = await ethers.getContractFactory("Host");
    const StimulusFac = await ethers.getContractFactory("Stimulus");
    const mutantFac = await ethers.getContractFactory("OppaBearMutantNFT");
    const labsFac = await ethers.getContractFactory("FusionLabsV2");
    const [owner, holder1, holder2] = await ethers.getSigners();

    const labsExpectedAddr = await getExpectedContractAddress(owner, 3);
    const host = await hostFac.deploy();
    await host.deployed();
    const stimulus = await StimulusFac.deploy();
    await stimulus.deployed();
    const mutant = await mutantFac.deploy(owner.address, labsExpectedAddr);
    await mutant.deployed();
    const labs = await labsFac.deploy(
      host.address,
      stimulus.address,
      mutant.address,
      1000
    );
    await labs.deployed();

    // console.log({
    //   host: host.address,
    //   stimulus: stimulus.address,
    //   mutant: mutant.address,
    //   labsExpect: labsExpectedAddr,
    //   labs: labs.address,
    //   //   owner: owner.address,
    //   holder1: holder1.address,
    //   holder2: holder2.address,
    // });

    return {
      host,
      stimulus,
      mutant,
      labs,
      owner,
      holder1,
      holder2,
    };
  }

  it("Should be able to mint NFT", async () => {
    const { host, stimulus, holder1, mutant, labs, holder2 } = await deploy();
    // console.log({
    //   host: host.address,
    //   stimulus: stimulus.address,
    //   mutant: mutant.address,
    //   labs: labs.address,
    //   //   owner: owner.address,
    //   holder1: holder1.address,
    //   holder2: holder2.address,
    // });
    await host.connect(holder1).mint();
    await stimulus.connect(holder1).mint();
    expect((await host.balanceOf(holder1.address)).toString()).to.equal("1");
    expect((await stimulus.balanceOf(holder1.address)).toString()).to.equal(
      "1"
    );
  });

  it("should start minting at tokenId 1 and has correct totalSupply", async () => {
    const { holder1, host } = await deploy();

    await host.connect(holder1).mint();
    await host.connect(holder1).mint();

    const totalSupply = await host.totalSupply();
    const owner = await host.ownerOf("1");
    const owner2 = await host.ownerOf("2");

    expect(totalSupply.toString()).to.equal("2");
    expect(owner.toString() === holder1.address).to.be.true;
    expect(owner2.toString() === holder1.address).to.be.true;
  });

  it("should be able to mint mutant after host and stimulus locked in the labs DO IT IN ONE GO!", async () => {
    const { host, stimulus, labs, mutant, holder1 } = await deploy();

    await host.connect(holder1).mint();
    await stimulus.connect(holder1).mint();
    await host.connect(holder1).approve(labs.address, "1");
    await stimulus.connect(holder1).approve(labs.address, "1");
    //lock
    //fusion
    await labs.connect(holder1).fusion("1", "1");

    const totalSupply = await mutant.totalSupply();
    expect(totalSupply.toString()).to.equal("1");
  });

  it("should be able to get all token infos", async () => {
    const { host, stimulus, labs, mutant, holder1 } = await deploy();

    const mintingTokensAmount = 3;

    for (let i = 0; i < mintingTokensAmount; i++) {
      const tokenId = i + 1;
      await host.connect(holder1).mint();
      await stimulus.connect(holder1).mint();
      await host.connect(holder1).approve(labs.address, tokenId);
      await stimulus.connect(holder1).approve(labs.address, tokenId);
    }

    for (let i = 0; i < mintingTokensAmount; i++) {
      const tokenId = i + 1;
      await labs.connect(holder1).fusion(tokenId, tokenId);
    }

    const totalSupply = await mutant.totalMinted();

    const infos = await mutant.getInfos();
    const parseInfos = infos.map((info) => info.toString());
    expect(parseInfos.length).to.equal(3);
  });

  it("should be able to set minted tokenURI after minted event emit", async () => {
    const { host, stimulus, labs, mutant, holder1, owner } = await deploy();

    const mintingTokensAmount = 1;
    const baseURI = "ipfs://SETTINGBASEURI.ipfs/";
    const decoder = new ethers.utils.AbiCoder();

    for (let i = 0; i < mintingTokensAmount; i++) {
      const tokenId = i + 1;
      await host.connect(holder1).mint();
      await stimulus.connect(holder1).mint();
      await host.connect(holder1).approve(labs.address, tokenId);
      await stimulus.connect(holder1).approve(labs.address, tokenId);
    }

    for (let i = 0; i < mintingTokensAmount; i++) {
      const tokenId = i + 1;
      await labs.connect(holder1).fusion(tokenId, tokenId);
      const mintedEvent = mutant.filters[
        "Minted(address,uint256,uint256,uint256)"
      ](holder1.address, 1, null, null);
      if (mintedEvent.address == holder1.address) {
        await mutant.connect(owner).setBaseURI(1, baseURI);
        const tokenuri = (await mutant.tokenURI("1")).toString();
        expect(tokenuri).to.equal(baseURI);
        await expect(mutant.tokenURI("2")).to.revertedWith(
          "ERC721Metadata: URI query for nonexistent token"
        );
      }
    }
  });
});
