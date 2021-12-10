const { ethers } = require("hardhat");
const fs = require('fs')
const chai = require("chai");
const expect = chai.expect;
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

chai.use(require('chai-as-promised'))

describe("end2end", function () {
  it("succeeds", async function () {
    const largeApproval = '100000000000000000000000000000000';
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const eth = ethers.BigNumber.from(10).pow(18)
    const gwei = ethers.BigNumber.from(10).pow(9)

    const [deployer, team] = await ethers.getSigners();

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


    // First block epoch occurs
    const firstEpochTimeUnixSeconds = Math.round(Date.now() / 1000) + 1800;
    // What epoch will be first epoch
    const firstEpochNumber = '0';
    // How many blocks are in each epoch
    const epochLengthInSeconds = ethers.BigNumber.from('3600');
    // Initial reward rate for epoch
    const initialRewardRate = '3000';
    // DAI bond BCV
    const daiBondBCV = '369';
    // Bond vesting length in blocks. 33110 ~ 5 days
    const bondVestingLengthSeconds = '3600';
    // Min bond price
    const minBondPrice = '200';
    // Max bond payout
    const maxBondPayout = 1e9;
    // DAO fee for bond
    const bondFee = '1000';
    // Max debt bond can take on
    const maxBondDebt = '1000000000000000';
    // Initial Bond debt
    const initialBondDebt = '0'
    // how much scr to mint initially
    const initialSCR = gwei.mul(1000);
    const initialPrice = 100;
    const initialIndex = gwei;

    const config = {
      firstEpochTimeUnixSeconds: firstEpochTimeUnixSeconds,
      firstEpochNumber: firstEpochNumber,
      epochLengthInSeconds: epochLengthInSeconds,
      initialRewardRate: initialRewardRate,
      daiBondBCV: daiBondBCV,
      bondVestingLengthSeconds: bondVestingLengthSeconds,
      minBondPrice: minBondPrice,
      maxBondPayout: maxBondPayout,
      bondFee: bondFee,
      maxBondDebt: maxBondDebt,
      initialBondDebt: initialBondDebt,
      initialSCR: initialSCR,
      initialPriceSCR: initialPrice,
      initialIndex: initialIndex,
      deployer: deployer,
    }

    // Deploy contracts
    let deployed = await deployContracts(config, dai);

    // Finish contract set up
    await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());
    await bootstrap(dai, config, deployed);
    await dai.approve(deployed.treasury.address, largeApproval).then(tx=>tx.wait());
    await deployed.treasury.queue(0, deployer.address).then(tx=>tx.wait());
    await deployed.treasury.toggle(0, deployer.address, zeroAddress).then(tx=>tx.wait());
    await deployed.treasury.deposit(eth.mul(100), dai.address, gwei.mul(50)).then(tx=>tx.wait());

    await factory.createPair(deployed.scr.address, dai.address).then(tx => tx.wait());
    const scrDaiLPAddress = await factory.getPair(deployed.scr.address, dai.address);

    const deployedBonds = await deployBonds(dai, scrDaiLPAddress, config, deployed);
    await bootstrapBonds(dai, scrDaiLPAddress, config, deployed, deployedBonds);

    const lp = await WETH.attach(scrDaiLPAddress);

    // Bond some reserve
    expect(await deployedBonds.daiBond.bondPrice()).to.eq('200');
    expect((await deployedBonds.daiBond.bondPriceInUSD())/1e18).to.eq(2);

    let daiAmt = eth.mul(100);
    let val = await deployed.treasuryWrapper.valueOfToken(dai.address, daiAmt);
    let payout = await deployedBonds.daiBond.payoutFor(val);

    await dai.approve(deployedBonds.daiBond.address, largeApproval).then(tx=>tx.wait());
    await deployedBonds.daiBond.deposit(daiAmt, '210', deployer.address).then(tx => tx.wait());

    expect(await deployedBonds.daiBond.bondPrice()).to.eq('35242');
    expect(await deployedBonds.daiBond.bondPriceInUSD()).to.eq(gwei.mul('352420000000'));

    // Mint some more LP for bonding
    let scrBal = await deployed.scr.balanceOf(deployer.address);
    let daiBal = await dai.balanceOf(deployer.address);
    await dai.approve(router.address, largeApproval).then(tx=>tx.wait());
    await deployed.scr.approve(router.address, largeApproval).then(tx=>tx.wait());
    await router.addLiquidity(deployed.scr.address, dai.address, scrBal, scrBal.mul(100).mul(gwei), 1, 1, deployer.address, 1e12).then(tx => tx.wait());
  })
})


