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
    const MIMAddress = dai.address;
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
    const lpBondBCV = 1;
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

    const Finalizer = await ethers.getContractFactory('Finalizer', deployer);
    finalizer = await Finalizer.deploy(
      deployed.treasury.address,
      deployed.staking.address,
      team.address,
      factory.address,
      deployed.chainlinkCalc.address
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
    await network.provider.send("evm_setNextBlockTimestamp", [startOfSale+(5*publicSaleSeconds)])
    await finalizer.finalize();
    await ido.claim().then(tx=>tx.wait());

    const expectedPrice = price; // 8 decimals
    expect(await deployed.treasuryWrapper.valueOfToken(scrReserveLPAddress, eth)).to.eq(expectedPrice.mul(10));
    expect(await deployedBonds.lpBond.bondPrice()).to.eq(200);

    const t = eth.mul(eth).div(expectedPrice.mul(1e10))
    console.log("test value ", t);
    expect(await deployedBonds.lpBond.payoutFor(
      await deployed.treasuryWrapper.valueOfToken(scrReserveLPAddress, t)
    )).to.eq('499999999');

    const expectedPayout = expectedPrice.mul(10).div(2);
    expect(await deployedBonds.lpBond.payoutFor(
      await deployed.treasuryWrapper.valueOfToken(scrReserveLPAddress, eth)
    )).to.eq(expectedPayout);
    expect(await deployedBonds.lpBond.bondPriceInUSD()).to.eq(eth.mul(2));

    expect(await deployedBonds.daiBond.bondPrice()).to.eq(100);
    expect(await deployed.treasuryWrapper.valueOfToken(dai.address, eth)).to.eq(gwei);
    expect(await deployedBonds.daiBond.bondPriceInUSD()).to.eq(eth);

    await deployed.treasury.pullManagement();
    await deployed.treasury.queue(0, deployer.address);
    await deployed.treasury.toggle(0, deployer.address, zeroAddress);
    await deployed.treasury.queue(3, deployer.address);
    await deployed.treasury.toggle(3, deployer.address, zeroAddress);
    await deployed.treasury.manage(reserve.address, eth.mul(100)).then(tx=>tx.wait())

    await reserve.approve(deployed.treasury.address, eth.mul(10000)).then(tx=>tx.wait())
    await deployed.treasury.deposit(eth.mul(50), MIMAddress, 0).then(tx=>tx.wait())

    await reserve.approve(router.address, largeApproval).then(tx=>tx.wait())
    await deployed.scr.approve(router.address, largeApproval).then(tx=>tx.wait())
    await router.addLiquidity(
      reserve.address,
      deployed.scr.address,
      eth.mul(50),
      gwei.mul(50),
      0,
      0,
      deployer.address,
      eth
    ).then(tx=>tx.wait())
    const bal = await DAI.attach(scrReserveLPAddress).balanceOf(deployer.address)
    console.log("balance ", bal)
    const depostBal = bal.div(4);
    expect(await deployedBonds.lpBond.principle()).to.eq(scrReserveLPAddress)
    const payout = await deployedBonds.lpBond.payoutFor(
      await deployed.treasuryWrapper.valueOfToken(scrReserveLPAddress, depostBal)
    );
    console.log("deposit bal ", depostBal)
    console.log("payout ", payout)
    await DAI.attach(scrReserveLPAddress).approve(
      deployedBonds.lpBond.address,
      eth.mul(10000),
    )
    await deployedBonds.lpBond.connect(deployer).deposit(depostBal, eth, deployer.address)
    const bondInfo = await deployedBonds.lpBond.bondInfo(deployer.address)
    const interest = bondInfo.payout;
    expect(interest).to.eq(payout)
  })
})


