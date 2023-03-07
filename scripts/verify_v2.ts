import { run } from "hardhat";

async function main() {
  const { host, stimulus, labs, mutant, owner } = {
    owner: "0x6aD07cabddd44c2523Bd5Ac209E6BaAF3d520d62",
    host: "0x6971430076576e1f7FE24b23498EeC63a090D370",
    stimulus: "0x373A76161426E12c03Fbf28c17d09Fc0582D3DB6",
    labs: "0xdf9107409745fFf3B6b46e9e6618E7C8579c402F",
    mutant: "0xd7946724F36205c6Cbcf9468Fdb4462d4291F9A1",
  };

  // verify Contracts
  // console.log("Host verifing =>  ", host);
  // await run("verify:verify", {
  //   address: host,
  //   contract: "contracts/Host.sol:Host",
  // });

  // console.log("Stimulus verifing =>  ", stimulus);
  // await run("verify:verify", {
  //   address: stimulus,
  //   contract: "contracts/Serum.v1.sol:SerumV1",
  // });

  // console.log("Labs verifying => ", labs);
  // await run("verify:verify", {
  //   address: labs,
  //   contract: "contracts/v2/FusionLabsV2.sol:FusionLabsV2",
  //   constructorArguments: [host, stimulus, mutant, 1000],
  // });
  //

  console.log("Mutant verifying => ", mutant);
  await run("verify:verify", {
    address: mutant,
    contract: "contracts/MutantOppabear.sol:OppaBearEvolutionGen2",
    constructorArguments: [owner, labs],
  }).catch((e) => console.error("gen2", e.message));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

// host: "0x6E9f9ba6ABBe0Fb7E2f88Bd43e91a78949b4719c",
// stimulus: "0xb01fCF558c3EC204e21E303267669254d7eea4BC",
// labs: "0x5ADCDB93B38CB675EE31f07AbB8b07630b100480",
// mutant: "0xC5D459f6f219A73eB7e6087A344B9CbCd91d743C",
