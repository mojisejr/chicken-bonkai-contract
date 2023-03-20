import { ethers, run } from "hardhat";

async function deploy() {
  const launchpadAddr = "0x202CCe504e04bEd6fC0521238dDf04Bc9E8E15aB";
  const launchPadFac = await ethers.getContractFactory("ChickenDAOBonkai");
  const nftFac = await ethers.getContractFactory("ChickenDAOBonkaiNFT");
  const [owner, admin, minter1, minter2, treasury, dev] =
    await ethers.getSigners();

  const launchpad = launchPadFac.attach(launchpadAddr);

  const nft = await nftFac.deploy(
    20,
    admin.address,
    owner.address,
    treasury.address,
    "SoomKaiNFT",
    "SCIK",
    [owner.address, treasury.address, admin.address],
    [80, 10, 10]
  );

  await nft.deployed();

  await launchpad.addNewNFT(nft.address, owner.address);

  const result = await launchpad.totalNft();

  console.log("deployed: ", launchpad.address);
  console.log("nft deployed: ", nft.address);
  console.log("totalnft: ", result.toString());
}

async function main() {
  await deploy();
  //   console.log("deployed addresses: ", { host, stimulus, labs, mutant });
  //   // const { host, stimulus, labs, mutant } = {
  //   //   host: "0x96d87cC25d8043DD7ef48734A9b953460d7bD4D5",
  //   //   stimulus: "0xCD5B715Cd77DB90B55b12a39bCc3E64fBb57385d",
  //   //   labs: "0x5CE5F2f5DE67565cd87fF7DD372a1bfb2BaE102C",
  //   //   mutant: "0xD277036173F4C365B54Df6DB6c7167C0afBE50Ab",
  //   // };

  //   // verify Contracts
  //   console.log("Host verifing =>  ", host);
  //   await run("verify:verify", {
  //     address: host,
  //     contract: "contracts/Host.sol:Host",
  //   });

  //   console.log("Stimulus verifing =>  ", stimulus);
  //   await run("verify:verify", {
  //     address: stimulus,
  //     contract: "contracts/Stimulus.sol:Stimulus",
  //   });

  //   console.log("Labs verifying => ", labs);
  //   await run("verify:verify", {
  //     address: labs,
  //     contract: "contracts/FusionLabs.sol:FusionLabs",
  //     constructorArguments: [host, stimulus, mutant, 1000],
  //   });

  //   console.log("Mutant verifying => ", mutant);
  //   await run("verify:verify", {
  //     address: mutant,
  //     contract: "contracts/Mutant.sol:Mutant",
  //     constructorArguments: [labs],
  //   });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// deployed addresses:  {
//   host: '0xd32b87eDC46Bc77f9C6f21498effC0a5176624c2',
//   stimulus: '0x5183D3a27AeC003aFCAF0A4a89515c4397672d79',
//   labs: '0x0331D5eab37809dFe764382A11B9B676F7886cc2',
//   mutant: '0xc84E1CAb3C09A4d152119d6d0F0B3015fFD5F4fE'
// }
