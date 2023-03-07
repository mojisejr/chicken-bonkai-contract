import { ethers, run } from "hardhat";
import { getExpectedContractAddress } from "../utils/getExpectedContractAddress";

async function deploy() {
  const hostFac = await ethers.getContractFactory("Host");
  const StimulusFac = await ethers.getContractFactory("Stimulus");
  const mutantFac = await ethers.getContractFactory("Mutant");
  const labsFac = await ethers.getContractFactory("FusionLabs");
  const [owner] = await ethers.getSigners();

  console.log("deploying ...");
  const labsExpectedAddr = await getExpectedContractAddress(owner, 3);
  const host = await hostFac.deploy();
  await host.deployed();
  console.log("host deployed ...");
  const stimulus = await StimulusFac.deploy();
  await stimulus.deployed();
  console.log("stimulus deployed ...");
  const mutant = await mutantFac.deploy(labsExpectedAddr);
  await mutant.deployed();
  console.log("mutant deployed ...");
  const labs = await labsFac.deploy(
    host.address,
    stimulus.address,
    mutant.address,
    1000
  );
  await labs.deployed();
  console.log("labs deployed ...");

  return {
    host: host.address,
    stimulus: stimulus.address,
    mutant: mutant.address,
    labsExpect: labsExpectedAddr,
    labs: labs.address,
  };
}

async function main() {
  const { host, stimulus, labs, mutant } = await deploy();
  console.log("deployed addresses: ", { host, stimulus, labs, mutant });
  // const { host, stimulus, labs, mutant } = {
  //   host: "0x96d87cC25d8043DD7ef48734A9b953460d7bD4D5",
  //   stimulus: "0xCD5B715Cd77DB90B55b12a39bCc3E64fBb57385d",
  //   labs: "0x5CE5F2f5DE67565cd87fF7DD372a1bfb2BaE102C",
  //   mutant: "0xD277036173F4C365B54Df6DB6c7167C0afBE50Ab",
  // };

  // verify Contracts
  console.log("Host verifing =>  ", host);
  await run("verify:verify", {
    address: host,
    contract: "contracts/Host.sol:Host",
  });

  console.log("Stimulus verifing =>  ", stimulus);
  await run("verify:verify", {
    address: stimulus,
    contract: "contracts/Stimulus.sol:Stimulus",
  });

  console.log("Labs verifying => ", labs);
  await run("verify:verify", {
    address: labs,
    contract: "contracts/FusionLabs.sol:FusionLabs",
    constructorArguments: [host, stimulus, mutant, 1000],
  });

  console.log("Mutant verifying => ", mutant);
  await run("verify:verify", {
    address: mutant,
    contract: "contracts/Mutant.sol:Mutant",
    constructorArguments: [labs],
  });
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
