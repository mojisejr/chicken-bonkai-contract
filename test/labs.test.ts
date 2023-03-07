import { expect } from "chai";
import { ethers } from "hardhat";
import { getExpectedContractAddress } from "../utils/getExpectedContractAddress";

describe("Labs Tests", async () => {
  async function deploy() {
    const hostFac = await ethers.getContractFactory("Host");
    const StimulusFac = await ethers.getContractFactory("Stimulus");
    const mutantFac = await ethers.getContractFactory("Mutant");
    const labsFac = await ethers.getContractFactory("FusionLabs");
    const [owner, holder1, holder2] = await ethers.getSigners();

    const labsExpectedAddr = await getExpectedContractAddress(owner, 3);
    const host = await hostFac.deploy();
    await host.deployed();
    const stimulus = await StimulusFac.deploy();
    await stimulus.deployed();
    const mutant = await mutantFac.deploy(labsExpectedAddr);
    await mutant.deployed();
    const labs = await labsFac.deploy(
      host.address,
      stimulus.address,
      mutant.address,
      1000,
      owner.address
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

  it("should be able to locked token to the labs", async () => {
    //1 mint host
    //2 mint stimulus
    //3 locked
    //4 check
    const { host, stimulus, labs, holder1 } = await deploy();

    await host.connect(holder1).mint();
    await stimulus.connect(holder1).mint();
    await host.connect(holder1).approve(labs.address, "1");
    await stimulus.connect(holder1).approve(labs.address, "1");
    await labs.connect(holder1).lock("1", "1");

    expect(await labs.isHostLocked("1")).to.equal(true);
    expect(await labs.isStimulusLocked("1")).to.equal(true);
  });
  it("should be able to mint mutant after host and stimulus locked in the labs", async () => {
    const { host, stimulus, labs, mutant, holder1 } = await deploy();

    await host.connect(holder1).mint();
    await stimulus.connect(holder1).mint();
    await host.connect(holder1).approve(labs.address, "1");
    await stimulus.connect(holder1).approve(labs.address, "1");
    //lock
    await labs.connect(holder1).lock("1", "1");
    //fusion
    await labs.connect(holder1).fusion("1", "1");

    const totalSupply = await mutant.totalSupply();
    expect(totalSupply.toString()).to.equal("1");
  });
  it("should be able to withdraw host and stimulus if not yet fusioned", async () => {
    const { host, stimulus, labs, mutant, holder1 } = await deploy();

    await host.connect(holder1).mint();
    await stimulus.connect(holder1).mint();
    await host.connect(holder1).approve(labs.address, "1");
    await stimulus.connect(holder1).approve(labs.address, "1");
    //lock
    await labs.connect(holder1).lock("1", "1");
    //fusion
    await labs.connect(holder1).cancelFusion("1");

    expect((await host.ownerOf("1")).toString()).to.equal(holder1.address);
    expect((await stimulus.ownerOf("1")).toString()).to.equal(holder1.address);
  });

  it("should be able to get fusionable pairs", async () => {
    const { host, stimulus, labs, mutant, holder1 } = await deploy();

    for (let i = 0; i < 5; i++) {
      await host.connect(holder1).mint();
      await stimulus.connect(holder1).mint();
    }

    for (let i = 1; i < 6; i++) {
      await host.connect(holder1).approve(labs.address, i);
      await stimulus.connect(holder1).approve(labs.address, i);
      await labs.connect(holder1).lock(i, i);
    }

    //USE SOME TOKENS
    await labs.connect(holder1).fusion(1, 1);
    await labs.connect(holder1).fusion(2, 2);

    const pairsString = await labs.getFusionablePairs(holder1.address);
    const parsed = JSON.parse(pairsString);

    expect(parsed.length).to.equal(3);
  });

  it("should be able to cancel locked tokens", async () => {
    const { host, stimulus, labs, mutant, holder1 } = await deploy();

    for (let i = 0; i < 5; i++) {
      await host.connect(holder1).mint();
      await stimulus.connect(holder1).mint();
    }

    for (let i = 1; i < 6; i++) {
      await host.connect(holder1).approve(labs.address, i);
      await stimulus.connect(holder1).approve(labs.address, i);
      await labs.connect(holder1).lock(i, i);
    }

    //canceled
    await labs.connect(holder1).cancelFusion(2);

    //USE SOME TOKENS
    // await labs.connect(holder1).fusion(1, 1);
    // await labs.connect(holder1).fusion(2, 2);

    const pairsString = await labs.getFusionablePairs(holder1.address);
    const parsed = JSON.parse(pairsString);
    // console.log(parsed);

    expect(parsed.length).to.equal(4);
  });
});
