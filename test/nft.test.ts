import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BonKai Tests", async () => {
  async function deploy() {
    const nftFac = await ethers.getContractFactory("ChickenDAOBonkaiNFT");
    const dNftFac = await ethers.getContractFactory("MockNFT");
    const dERC20Fac = await ethers.getContractFactory("MockToken");

    const [owner, admin, minter1, minter2, treasury, dev] =
      await ethers.getSigners();

    // @params
    // uint256 _supply,
    // address _admin,
    // address _owner,
    // string memory _name,
    // string memory _symbol

    const nft = await nftFac.deploy(
      1000,
      admin.address,
      owner.address,
      treasury.address,
      "SoomKaiNFT",
      "SCIK",
      [owner.address, treasury.address, admin.address],
      [80, 10, 10]
    );

    const dNft = await dNftFac.deploy();
    const dERC20 = await dERC20Fac.deploy();

    await nft.deployed();
    await dNft.deployed();
    await dERC20.deployed();

    return {
      nft,
      dNft,
      dERC20,
      owner,
      admin,
      minter1,
      minter2,
      treasury,
      dev,
    };
  }

  it("Deployment", async () => {
    const { nft, owner, admin, minter1, minter2 } = await deploy();
    // console.log({
    //   nft: nft.address,
    //   owner: owner.address,
    //   admin: admin.address,
    //   minter1: minter1.address,
    //   minter2: minter2.address,
    // });

    expect((await nft.name()).toString()).to.equal("SoomKaiNFT");
  });

  describe("Round creation", async () => {
    it("1. should be able to create round", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const price = ethers.utils.parseEther("1");
      const start = 1678416545;
      const end = 1678424105;

      await createRound(nft, admin, start, end);

      expect((await nft.getCurrentRound()).toString()).to.equal("1");
    });
    it("2. shouldn't be created with more than max supply", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const price = ethers.utils.parseEther("1");
      const start = 1678416545;
      const end = 1678424105;

      await createRound(nft, admin, start, end);
      expect(await createRound(nft, admin, start, end)).to.be.revertedWith(
        "CREATE_NEW_ROUND : not enough space."
      );
    });
    it("3. shouldn't be created if _maxMintPerTx greater than _allowance", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const start = 1678416545;
      const end = 1678424105;

      expect(await createRound(nft, admin, start, end)).to.be.revertedWith(
        "CREATE_NEW_ROUND : invalid max mint per tx amount."
      );
    });
    it("4. should be create the correct round number", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const price = ethers.utils.parseEther("1");
      const start = 1678416545;
      const end = 1678424105;
      await createRound(nft, admin, start, end);
      await createRound(nft, admin, start, end);
      expect((await nft.getCurrentRound()).toString()).to.equal("1");
    });
  });

  describe("Round Management", async () => {
    it("1. shouldn't be able to go next round only when previous one is ended", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const start2 = lastest + time.duration.minutes(20);
      const end2 = lastest + time.duration.minutes(30);

      await createRound(nft, admin, start1, end1);
      await createRound(nft, admin, start2, end2);

      await time.increaseTo(lastest + time.duration.minutes(21));

      await nft.connect(admin).nextRound();

      const activeRound = await nft.getCurrentRound();

      expect(activeRound.toString()).to.equal("2");
    });
    it("2. should be able to get spcific round informations", async () => {
      const { nft, dNft, dERC20, owner, admin, minter1, minter2 } =
        await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const start2 = lastest + time.duration.minutes(20);
      const end2 = lastest + time.duration.minutes(30);
      const start3 = lastest + time.duration.minutes(40);
      const end3 = lastest + time.duration.minutes(50);

      await createRound(nft, admin, start1, end1);
      await createNFTRound(nft, admin, start2, end2, dNft);
      await createTokenRound(nft, admin, start3, end3, dERC20);

      const round = await nft.connect(admin).getRoundInfo("1");
      expect(round.name.toString()).to.equal("Public Mint");
    });
    it("3. should be able to get all round informations", async () => {
      const { nft, dNft, dERC20, owner, admin, minter1, minter2 } =
        await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const start2 = lastest + time.duration.minutes(20);
      const end2 = lastest + time.duration.minutes(30);
      const start3 = lastest + time.duration.minutes(40);
      const end3 = lastest + time.duration.minutes(50);

      await createRound(nft, admin, start1, end1);
      await createNFTRound(nft, admin, start2, end2, dNft);
      await createTokenRound(nft, admin, start3, end3, dERC20);

      const round = await nft.connect(admin).getAllRounds();
      //include zero index
      expect(round.length).to.equal(4);
    });
  });

  describe("Minting", async () => {
    it("1. should be able to mint the current round", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await createRound(nft, admin, start1, end1);

      await nft.connect(minter1).mint(amountToMint, [], { value: payment });

      expect((await nft.totalSupply()).toString()).to.equal("1");
    });
    it("2. should be able to mint with TYPE PUBLIC", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await createRound(nft, admin, start1, end1);

      await nft.connect(minter1).mint(amountToMint, [], { value: payment });

      expect((await nft.totalSupply()).toString()).to.equal("1");
    });
    it("3. should be able to mint with TYPE NFT", async () => {
      const { nft, dNft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await createNFTRound(nft, admin, start1, end1, dNft);

      await dNft.connect(minter1).mint(1);

      await nft.connect(minter1).mint(amountToMint, [], { value: payment });

      expect((await nft.totalSupply()).toString()).to.equal("1");
    });
    it("4. should be able to mint with TYPE WALLET (merkle)", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await createMerkleRound(nft, admin, start1, end1);
      const currentround = await nft.getCurrentRound();

      //SET ROOT HASH
      const root = await getRootHash();
      await nft.connect(admin).setRootHash(currentround.toString(), root);

      //GET PROOFS
      const hashedMinter = keccak256(minter1.address);
      const proofs = await getProofs(hashedMinter);

      await nft.connect(minter1).mint(amountToMint, proofs, { value: payment });

      expect((await nft.totalSupply()).toString()).to.equal("1");
    });
    it("5. should be able to mint with TYPE ERC20", async () => {
      const { nft, dERC20, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;

      await createTokenRound(nft, admin, start1, end1, dERC20);

      await dERC20.connect(minter1).mint(minter1.address, 10000);
      await dERC20.connect(minter1).approve(nft.address, 10000);

      await nft.connect(minter1).mint(amountToMint, []);

      expect((await nft.totalSupply()).toString()).to.equal("1");
    });
    it("6. shouldn't be able to mint when minting time ended", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await time.increaseTo(end1 + time.duration.minutes(10));

      await createRound(nft, admin, start1, end1);

      await expect(
        nft.connect(minter1).mint(amountToMint, [], { value: payment })
      ).to.be.revertedWith("MINT : minting is ended.");
    });
    it("7. shouldn't be able to mint more than mintPerTx of each round", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 2;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await createRound(nft, admin, start1, end1);

      await expect(
        nft.connect(minter1).mint(amountToMint, [], { value: payment })
      ).to.be.revertedWith("MINT : invalid minting per tx");
    });

    it("8. shouldn't be able to mint without pay", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;

      await createRound(nft, admin, start1, end1);

      await expect(
        nft.connect(minter1).mint(amountToMint, [])
      ).to.be.revertedWith("MINT : invalid minting price");
    });

    it("9. shouldn't able to mint of reached to the allowance", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await createRound(nft, admin, start1, end1);

      await nft.connect(minter1).mint(amountToMint, [], { value: payment });
      await nft.connect(minter1).mint(amountToMint, [], { value: payment });
      await nft.connect(minter2).mint(amountToMint, [], { value: payment });
      await nft.connect(minter1).mint(amountToMint, [], { value: payment });
      await nft.connect(minter1).mint(amountToMint, [], { value: payment });

      await expect(
        nft.connect(minter2).mint(amountToMint, [], { value: payment })
      ).to.be.revertedWith("MINT : this round has been minted out.");
    });

    it("10. shouldn't be able to mint if reach max supply", async () => {
      const { nft, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 9;
      const price = ethers.utils.parseEther("1");
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await nft
        .connect(admin)
        .createNewRound(
          "Public Mint",
          "public mint for everyone",
          price,
          start1,
          end1,
          9,
          0,
          10,
          "0x0000000000000000000000000000000000000000",
          0
        );
      await nft.connect(minter1).mint(amountToMint, [], { value: payment });
      await nft.connect(minter2).mint(1, [], { value: price });

      await expect(
        nft.connect(minter2).mint(1, [], { value: price })
      ).to.be.revertedWith("MINT : this round has been minted out.");
    });
  });
  describe("Payment Sharing", async () => {
    it("1. should be able to withdraw KUB and splitted correctly", async () => {
      const { nft, owner, admin, minter1, minter2, treasury, dev } =
        await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;
      const payment = ethers.utils.parseEther(amountToMint.toString());

      await createRound(nft, admin, start1, end1);

      await nft.connect(minter1).mint(amountToMint, [], { value: payment });

      await nft.connect(admin).withdrawKUB();
      const balanceAfter = await nft.getBalance();
      expect(balanceAfter.toString()).to.equal("0");
    });
    it("2. should be able to with draw ERC20 and splitted correctly", async () => {
      const { nft, dERC20, owner, admin, minter1, minter2 } = await deploy();
      const lastest = await time.latest();
      const start1 = lastest;
      const end1 = lastest + time.duration.minutes(10);
      const amountToMint = 1;

      await createTokenRound(nft, admin, start1, end1, dERC20);
      await dERC20.connect(minter1).mint(minter1.address, 10000);
      await dERC20.connect(minter1).approve(nft.address, 10000);

      await nft.connect(minter1).mint(amountToMint, []);

      await nft.connect(admin).withdrawERC20(dERC20.address);

      expect((await nft.getERC20Balance(dERC20.address)).toString()).to.equal(
        "0"
      );
    });
  });
});

async function createRound(nft: any, admin: any, start: number, end: number) {
  const price = ethers.utils.parseEther("1");
  await nft
    .connect(admin)
    .createNewRound(
      "Public Mint",
      "public mint for everyone",
      price,
      start,
      end,
      1,
      0,
      5,
      "0x0000000000000000000000000000000000000000",
      0
    );
}

async function createNFTRound(
  nft: any,
  admin: any,
  start: number,
  end: number,
  dNft: any
) {
  const price = ethers.utils.parseEther("1");
  await nft.connect(admin).createNewRound(
    "NFT Mint",
    "only for who has nft",
    price,
    start,
    end,
    1,
    1, //NFT TYPE
    5,
    dNft.address,
    1
  );
}

async function createMerkleRound(
  nft: any,
  admin: any,
  start: number,
  end: number
) {
  const price = ethers.utils.parseEther("1");
  await nft.connect(admin).createNewRound(
    "NFT Mint",
    "only for who has nft",
    price,
    start,
    end,
    1,
    2, //Merkle TYPE
    5,
    "0x0000000000000000000000000000000000000000",
    0
  );
}

async function createTokenRound(
  nft: any,
  admin: any,
  start: number,
  end: number,
  dERC20: any
) {
  // const price = ethers.utils.parseEther("1");
  await nft.connect(admin).createNewRound(
    "token Mint",
    "only for who has token",
    0,
    start,
    end,
    1,
    3, //TOKEN TYPE
    5,
    dERC20.address,
    10000
  );
}

async function getMerkleTree() {
  const [owner, admin, minter1, minter2] = await ethers.getSigners();

  //whitelist
  const addresses = [
    owner.address,
    admin.address,
    minter1.address,
    minter2.address,
  ];

  //leafNodes
  const leafNodes = addresses.map((addr) => keccak256(addr));

  //merkleTree
  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true });
  return merkleTree;
}

async function getRootHash() {
  const merkleTree = await getMerkleTree();
  const root = merkleTree.getRoot();

  // console.log("ROOT: 0x", root.toString("hex"));

  return `0x${root.toString("hex")}`;
}

async function getProofs(minter: any) {
  const merkleTree = await getMerkleTree();
  const hexProofs = merkleTree.getHexProof(minter);
  // console.log("PROOF: ", hexProofs);
  return hexProofs;
}
