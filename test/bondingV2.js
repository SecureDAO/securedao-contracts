const { ethers } = require("hardhat");
const fs = require('fs')
const chai = require("chai");
const expect = chai.expect;
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

chai.use(require('chai-as-promised'))
const eth = ethers.BigNumber.from(10).pow(18)
const gwei = ethers.BigNumber.from(10).pow(9)
const largeApproval = '100000000000000000000000000000000';
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe("bonding", function () {
  const priceFeedDecimals = 8;
  const price = ethers.BigNumber.from(50).mul(1e8);
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
  const lpBondBCV = 1;
  // Bond vesting length in blocks. 33110 ~ 5 days
  const bondVestingLengthSeconds = 3600 * 24 * 5;
  // Min bond price
  const minBondPriceReserve = 100;
  const minBondPriceLP = 100; // TODO
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

  let
    daoAddress,
    deployer,
    team,
    DAI,
    feed,
    dai,
    factory,
    router,
    config,
    deployed,
    deployedBonds,
    pair
  ;

  before( async function () {
    [deployer, team] = await ethers.getSigners();
    daoAddress = deployer.address;
    // Deploy mock feed

    const Feed = await ethers.getContractFactory('PriceFeed');
    feed = await Feed.deploy(priceFeedDecimals, price)
    await feed.deployed();

    // Deploy DAI
    DAI = await ethers.getContractFactory('DAI');
    dai = await DAI.deploy( 0 );
    await dai.deployed();
    await dai.mint( deployer.address, eth.mul(1e6) );

    const Factory = await ethers.getContractFactory('Factory');
    factory = await Factory.deploy(zeroAddress);
    await factory.deployed();

    const WETH = await ethers.getContractFactory('WETH', deployer);
    const weth = await WETH.deploy();
    const Router = await ethers.getContractFactory('Router', deployer);

    router = await Router.deploy(factory.address, weth.address);
    await router.deployed();

    const block = await ethers.provider.getBlock("latest");
    console.log("block timestamp ", block.timestamp)

    const reserve = dai;

    config = {
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
    deployed = await deployContracts(config, reserve);

    // Finish contract set up
    await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());
    await bootstrap(reserve, config, deployed);

    await factory.createPair(deployed.scr.address, reserve.address).then(tx => tx.wait());
    const scrReserveLPAddress = await factory.getPair(deployed.scr.address, reserve.address);
    pair = await DAI.attach(scrReserveLPAddress);

    console.log("feed addrress ", feed.address);
    deployedBonds = await deployBonds(reserve, scrReserveLPAddress, config, deployed);

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

    await deployed.treasury.queue('5', pair.address).then(tx => tx.wait());
    await deployed.treasury.toggle('5', pair.address, deployed.chainlinkCalc.address).then(tx => tx.wait());
  })

  it("values the token correctly", async () => {
    expect(await deployed.treasuryWrapper.valueOfToken(pair.address, eth)).to.eq(price*10);
  })

  it("has the correct bond price", async () => {
    expect(await deployedBonds.lpBond.bondPrice()).to.eq(200);
    expect(await deployedBonds.lpBond.bondPriceInUSD()).to.eq(eth.mul(2));
  })

  it("calculates the correct payout", async () => {
    expect(await deployedBonds.lpBond.payoutFor(price)).to.eq(price.div(2));
  })

  const oneDAILP = ethers.BigNumber.from(1e10).mul(1e6).mul(1e10).div(price);
  it("calculates the valuation for $1 of asset", async () => {
    expect(await deployed.treasuryWrapper.valueOfToken(pair.address, oneDAILP)).to.eq(gwei);
  })

  it("bonds successfully", async () => {
    await pair.approve(deployedBonds.lpBond.address, largeApproval).then(tx=>tx.wait());
    await deployedBonds.lpBond.deposit(oneDAILP, eth.mul(1000), deployer.address).then(tx => tx.wait())
    expect((await deployedBonds.lpBond.bondInfo(deployer.address)).payout).to.eq(gwei.div(2));
  })

  it("succeeds for reserve bonds", async function () {
    const block = await ethers.provider.getBlock("latest");
    console.log("block timestamp ", block.timestamp)

    const reserve = dai;

    config = {
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
    deployed = await deployContracts(config, reserve);

    // Finish contract set up
    await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());
    await bootstrap(reserve, config, deployed);

    await factory.createPair(deployed.scr.address, reserve.address).then(tx => tx.wait());
    const scrReserveLPAddress = await factory.getPair(deployed.scr.address, reserve.address);
    const pair = await DAI.attach(scrReserveLPAddress);

    console.log("feed addrress ", feed.address);
    deployedBonds = await deployBonds(reserve, scrReserveLPAddress, config, deployed);

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

    expect(await deployed.treasuryWrapper.valueOfToken(dai.address, eth)).to.eq(gwei);
    expect(await deployedBonds.daiBond.bondPrice()).to.eq(minBondPriceReserve);
    expect(await deployedBonds.daiBond.bondPriceInUSD()).to.eq(eth);
    expect(await deployedBonds.daiBond.payoutFor(gwei)).to.eq(gwei);
    await dai.approve(deployedBonds.daiBond.address, largeApproval).then(tx=>tx.wait());
    await deployedBonds.daiBond.deposit(eth.mul(2), eth.mul(1000), deployer.address).then(tx => tx.wait())
    expect((await deployedBonds.daiBond.bondInfo(deployer.address)).payout).to.eq(gwei.mul(2));
  })
})

