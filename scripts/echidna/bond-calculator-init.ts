import { ethers } from "hardhat";
import { ChainlinkBondingCalculatorDeployer, BondDepositoryV2Deployer, LiquidTokenDeployer } from "../../utils/deploy-ts";
const BigNumber = ethers.BigNumber;

async function main() {
  const [deployer] = await ethers.getSigners();

  const scr = await new LiquidTokenDeployer(deployer).deploy();
  let tx = await scr.setVault(deployer.address);
  tx.wait();
  tx = await scr.mint(deployer.address, ethers.constants.WeiPerEther.mul(1000));
  tx.wait();

  const DAI = await ethers.getContractFactory('DAI');
  const dai = await DAI.deploy( 0 );
  await dai.deployed();

  const tokenA = await DAI.deploy( 0 );
  await tokenA.deployed();

  const Treasury = await ethers.getContractFactory('MockTreasury');
  const treasury = await Treasury.deploy();
  await treasury.deployed();

  const priceFeedDecimals = 8;
  const price = ethers.BigNumber.from(63245553203367);
  const Feed = await ethers.getContractFactory('PriceFeed');
  const feed = await Feed.deploy(priceFeedDecimals, price)

  const chainlinkCalc = await new ChainlinkBondingCalculatorDeployer(deployer, scr.address).deploy();

  tx = await chainlinkCalc.updatePriceFeed(tokenA.address, feed.address);
  tx.wait();

  const bond = await new BondDepositoryV2Deployer(deployer, scr.address, treasury.address, tokenA.address, chainlinkCalc.address, deployer.address).deploy();
  tx = await bond.initializeBondTerms(
    "40",
    "1000",
    "100",
    "10",
    "1000",
    "0",
    "3600"
  );
  tx.wait();

  console.log("payout");
  console.log(await bond.payoutFor(0));
  console.log("bond ", bond.address)
  console.log("principle ", tokenA.address)
  console.log("scr ", scr.address)

  await new Promise( resolve => setTimeout(resolve, 1000) )
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})

