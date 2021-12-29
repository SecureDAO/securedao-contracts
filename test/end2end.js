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

    const publicSaleSeconds = 24*3600;
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
    const daiBondBCV = 873;
    // MIM-SCR bond BCV
    const lpBondBCV = 370;
    // Bond vesting length in blocks. 33110 ~ 5 days
    const bondVestingLengthSeconds = 3600 * 24 * 5;
    // Min bond price
    const minBondPriceReserve = '10200';
    const minBondPriceLP = '820'; // TODO
    // Max bond payout
    const maxBondPayout = 410; // 0.41%
    // DAO fee for bond
    const bondFee = 1000; // 10%
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

    const deployedBonds = await deployBonds(reserve, scrReserveLPAddress, config, deployed);

    await bootstrapBonds(reserve, scrReserveLPAddress, config, deployed, deployedBonds);

    const Finalizer = await ethers.getContractFactory('Finalizer', deployer);
    finalizer = await Finalizer.deploy(
      deployed.treasury.address,
      deployed.staking.address,
      team.address,
      factory.address,
      deployed.olympusBondingCalculator.address
    );
    await finalizer.deployed()

    const IDO = await ethers.getContractFactory('IDO');
    const args = [
      reserve.address,
      deployed.staking.address,
      finalizer.address,
      totalNativeForSale,
      salePrice,
      startOfSale,
      publicSaleAlloc,
    ]
    const ido = await IDO.deploy(...args);
    await ido.deployed();

    await finalizer.setIDO(ido.address).then(tx=>tx.wait());
    await ido.whiteListBuyers([deployer.address]).then(tx=>tx.wait());
    await network.provider.send("evm_setNextBlockTimestamp", [startOfSale])
    await network.provider.send("evm_mine")
    await ido.initialize();

    const totalAmt = await ido.totalAmount();
    const purchaseAmount = totalAmt.mul(await ido.salePrice()).div(gwei);
    for (let b of [deployer]) {
      await dai.mint(b.address, eth.mul(1e6)).then(tx=>tx.wait());
      await dai.connect(b).approve(ido.address, largeApproval).then(tx=>tx.wait());
      await ido.connect(b).purchase(purchaseAmount).then(tx=>tx.wait());
    }
    await network.provider.send("evm_setNextBlockTimestamp", [startOfSale+publicSaleSeconds])
    await network.provider.send("evm_mine")
    await ido.initialize();
    let startOfPrivateSale = await ido.startOfPrivateSale();
    await network.provider.send("evm_setNextBlockTimestamp", [Number(startOfPrivateSale)+publicSaleSeconds])
    await ido.disableWhiteList().then(tx=>tx.wait());
    await deployed.treasury.pushManagement(finalizer.address).then(tx=>tx.wait());
    await network.provider.send("evm_setNextBlockTimestamp", [startOfSale+(4*publicSaleSeconds)])
    await finalizer.finalize();
    await ido.claim().then(tx=>tx.wait());

    expect(await deployedBonds.daiBond.bondPriceInUSD()).to.eq(eth.mul(102));
    expect(await deployedBonds.lpBond.bondPriceInUSD()).to.gte(eth.mul(95));
    expect(await deployedBonds.lpBond.bondPriceInUSD()).to.lte(eth.mul(97));
    expect(await deployed.treasuryWrapper.valueOfToken(scrReserveLPAddress, eth)).to.eq("63245553203367");
    expect(await deployed.treasuryWrapper.valueOfToken(dai.address, eth)).to.eq(gwei);
  })
})


