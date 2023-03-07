import { expect } from "chai";
import { ethers } from "hardhat";

describe("Labs Tests", async () => {
  async function deploy() {
    const hostFac = await ethers.getContractFactory("Host");
    const StimulusFac = await ethers.getContractFactory("Stimulus");
    const [owner, holder1, holder2] = await ethers.getSigners();

    const host = await hostFac.deploy();
    await host.deployed();
    const stimulus = await StimulusFac.deploy();
    await stimulus.deployed();

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
      owner,
      holder1,
      holder2,
    };
  }

  it("Should be able to mint NFT", async () => {
    const { host, stimulus, holder1, holder2 } = await deploy();
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

  it("should have token URI with random traits", async () => {
    const { holder1, host, stimulus } = await deploy();

    //mint
    host.connect(holder1).mint();
    stimulus.connect(holder1).mint();

    const hostUri = (await host.tokenURI(1)).toString();
    const stiUri = (await stimulus.tokenURI(1)).toString();

    console.log("host uri", hostUri);
    console.log("stimulus uri", stiUri);

    expect(hostUri).to.not.equal("");
    expect(stiUri).to.not.equal("");
  });
});
