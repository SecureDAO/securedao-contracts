const { ethers } = require("hardhat");
const fs = require('fs')
const chai = require("chai");
const expect = chai.expect;
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

chai.use(require('chai-as-promised'))

async function main() {
    const largeApproval = '100000000000000000000000000000000';
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const eth = ethers.BigNumber.from(10).pow(18)
    const gwei = ethers.BigNumber.from(10).pow(9)

    const [deployer, team] = await ethers.getSigners();
    const daoAddress = deployer.address;
    const publicSaleSeconds = 24*3600;
    // Deploy mock feed
    const priceFeedDecimals = 8;
    const price = ethers.BigNumber.from(63245553203367);
    const Feed = await ethers.getContractFactory('PriceFeed');
    const feed = await Feed.deploy(priceFeedDecimals, price)
    await feed.deployed();

    // Deploy DAI
    const DAI = await ethers.getContractFactory('DAI');
    const dai = await DAI.deploy( 0 );
    await dai.deployed();
    await dai.mint( deployer.address, eth.mul(1e6) );

    const Factory = await ethers.getContractFactory('Factory');
    const factory = await Factory.deploy(zeroAddress);
    await factory.deployed();

    const WETH = await ethers.getContractFactory('WETH', deployer);
    const weth = await WETH.deploy();
    const Router = await ethers.getContractFactory('Router', deployer);

    const router = await Router.deploy(factory.address, weth.address);
    await router.deployed();

    const firstEpochDelay = 1800;
    const saleDelay = (60*1);

    // Time of first epoch
    const firstEpochTimeUnixSeconds = Math.round(Date.now() / 1000) + firstEpochDelay;
    // What epoch will be first epoch
    const firstEpochNumber = '1';
    // How many blocks are in each epoch
    const epochLengthInSeconds = 3600 * 8; // 8 hours
    // Initial reward rate for epoch
    const initialRewardRate = 30000; // 3%
    // MIM bond BCV
    const daiBondBCV = 1;
    // MIM-SCR bond BCV
    const lpBondBCV = 2000;
    // Bond vesting length in blocks. 33110 ~ 5 days
    const bondVestingLengthSeconds = 3600 * 24 * 5;
    // Min bond price
    const minBondPriceReserve = 1;
    const minBondPriceLP = 1; // TODO
    // Max bond payout
    const maxBondPayout = 410; // 0.41%
    // DAO fee for bond
    const bondFee = 0; // 10%
    // Max debt bond can take on
    const maxBondDebtLP = gwei.mul(8).mul(1e4);
    const maxBondDebtReserve = gwei.mul(3).mul(1e4);
    // Initial Bond debt
    const initialBondDebt = '0'
    const initialIndex = gwei;

    const totalNativeForSale = gwei.mul(2500);
    const salePrice = eth.mul(100);
    const block = await ethers.provider.getBlock("latest");
    console.log("block timestamp ", block.timestamp)
    const startOfSale = block.timestamp + saleDelay;
    const publicSaleAlloc = gwei.mul(5);

    const reserve = dai;

    const config = {
      firstEpochTimeUnixSeconds: firstEpochTimeUnixSeconds,
      dao: deployer.address,
      firstEpochNumber: firstEpochNumber,
      epochLengthInSeconds: epochLengthInSeconds,
      initialRewardRate: initialRewardRate,
      bondVestingLengthSeconds: bondVestingLengthSeconds,
      maxBondPayout: maxBondPayout,
      initialBondDebt: initialBondDebt,
      initialIndex: initialIndex,
      bondFee: bondFee,
      daiBondBCV: daiBondBCV,
      lpBondBCV: lpBondBCV,
      minBondPriceLP: minBondPriceLP,
      minBondPriceReserve: minBondPriceReserve,
      maxBondDebtReserve: maxBondDebtReserve,
      maxBondDebtLP: maxBondDebtLP,
      deployer: deployer,
    }

    // Deploy contracts
    let deployed = await deployContracts(config, reserve);

    // Finish contract set up
    await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());
    await bootstrap(reserve, config, deployed);

    await factory.createPair(deployed.scr.address, reserve.address).then(tx => tx.wait());
    const scrReserveLPAddress = await factory.getPair(deployed.scr.address, reserve.address);

    console.log("feed addrress ", feed.address);
    const deployedBonds = await deployBonds(reserve, scrReserveLPAddress, config, deployed);

    await bootstrapBonds(reserve, feed.address, scrReserveLPAddress, config, deployed, deployedBonds);

    await reserve.mint(deployer.address, eth.mul(1e9));
    await reserve.approve(deployed.treasury.address, largeApproval).then(tx=>tx.wait());
    await deployed.treasury.queue(0, deployer.address);
    await deployed.treasury.toggle(0, deployer.address, zeroAddress);
    await deployed.treasury.deposit(eth.mul(1000), reserve.address, 0);
    await deployed.treasury.deposit(eth.mul(1000), reserve.address, await deployed.treasuryWrapper.valueOfToken(dai.address, eth.mul(1000)));

    await reserve.approve(router.address, largeApproval).then(tx=>tx.wait());
    await deployed.scr.approve(router.address, largeApproval).then(tx=>tx.wait());
    await router.addLiquidity(
      deployed.scr.address,
      reserve.address,
      gwei.mul(1000),
      eth.mul(1000*100),
      gwei.mul(1000),
      eth.mul(1000*100),
      deployer.address,
      eth.mul(1000),
    )
    const ADDRESSES = {
        DAO_ADDRESS: daoAddress,
        SCR_ADDRESS: deployed.scr.address,
        SSCR_ADDRESS: deployed.sscr.address,
        MIM_ADDRESS: reserve.address,
        STAKING_ADDRESS: deployed.staking.address,
        STAKING_HELPER_ADDRESS: deployed.stakingHelper.address,
        SCR_BONDING_CALC_ADDRESS: deployed.chainlinkCalc.address,
        TREASURY_ADDRESS: deployed.treasury.address,
        ZAPIN_ADDRESS: "0xc669dC61aF974FdF50758d95306e4083D36f1430",
        MIM_BOND_ADDRESS: deployedBonds.daiBond.address,
        MIM_SCR_LP_ADDRESS: scrReserveLPAddress,
        MIM_SCR_LP_BOND_ADDRESS: deployedBonds.lpBond.address,
    };

    console.log("factory ", factory.address);
    console.log(ADDRESSES);

}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})



