const { ethers } = require("hardhat");
const fs = require('fs')
const chai = require("chai");
const expect = chai.expect;
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

chai.use(require('chai-as-promised'))

describe("Finalizer", function () {
    const largeApproval = '100000000000000000000000000000000';
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const eth = ethers.BigNumber.from(10).pow(18)
    const gwei = ethers.BigNumber.from(10).pow(9)
    // What epoch will be first epoch
    const firstEpochNumber = '1';
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

    let
      deployer,
      deployedBonds,
      buyer,
      buyer2,
      finalizer,
      team,
      dai,
      DAI,
      scr,
      sscr,
      factory,
      weth,
      router,
      firstEpochTimeUnixSeconds,
      salePrice,
      deployed,
      config,
      totalNativeForSale,
      pair
    ;


  beforeEach(async function () {
    [deployer, team, buyer, buyer2] = await ethers.getSigners();

    firstEpochTimeUnixSeconds = Math.round(Date.now() / 1000) + 1800;;
    // Deploy DAI
    DAI = await ethers.getContractFactory('DAI');
    dai = await DAI.deploy( 0 );
    await dai.deployed();
    await dai.mint( deployer.address, eth.mul(1e6) );

    const Factory = await ethers.getContractFactory('Factory');
    factory = await Factory.deploy(zeroAddress);
    await factory.deployed();

    const WETH = await ethers.getContractFactory('WETH', deployer);
    weth = await WETH.deploy();
    const Router = await ethers.getContractFactory('Router', deployer);

    router = await Router.deploy(factory.address, weth.address);
    await router.deployed();

    config = {
      dao: deployer.address,
      firstEpochTimeUnixSeconds: firstEpochTimeUnixSeconds,
      firstEpochNumber: firstEpochNumber,
      epochLengthInSeconds: epochLengthInSeconds,
      initialRewardRate: initialRewardRate,
      bondVestingLengthSeconds: bondVestingLengthSeconds,
      maxBondPayout: maxBondPayout,
      initialBondDebt: initialBondDebt,
      initialIndex: initialIndex,
      bondFee: bondFee,
      daiBondBCV: daiBondBCV,
      lpBondBCV: daiBondBCV,
      minBondPriceLP: minBondPrice,
      minBondPriceReserve: minBondPrice,
      maxBondDebtReserve: maxBondDebt,
      maxBondDebtLP: maxBondDebt,
      deployer: deployer,
    }

    // Deploy contracts
    deployed = await deployContracts(config, dai);
    scr = deployed.scr;
    sscr = deployed.sscr;
  })

  describe('interactions', async function() {
    let ido;
    let lpPercent = 7000;
    let teamPercent = 1000;
    let markup = 13700;
    let balBefore;
    let publicSaleSeconds = 24 * 3600;

    beforeEach(async function() {
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
      totalNativeForSale = gwei.mul(1000);
      salePrice = eth.mul(100);

      const startOfSale = '1';
      const publicSaleAlloc = gwei.mul(200);
      const args = [
        dai.address,
        deployed.staking.address,
        finalizer.address,
        totalNativeForSale,
        salePrice,
        startOfSale,
        publicSaleAlloc,
      ]
      ido = await IDO.deploy(...args);
      await ido.deployed();


      await finalizer.setIDO(ido.address).then(tx=>tx.wait());

      await ido.whiteListBuyers([buyer.address, team.address]).then(tx=>tx.wait());
      await ido.initialize();

      await factory.createPair(scr.address, dai.address).then(tx=>tx.wait());
      pair = await factory.getPair(scr.address, dai.address);
    })

    describe("ido is not finished", async function() {
      describe("finalize", async function() {
        it("finalizes the IDO", async function() {
          await deployed.treasury.pushManagement(finalizer.address).then(tx=>tx.wait());
          await expect(finalizer.finalize()).to.revertedWith("Public sale not started");
        })
      })
    })

    describe("ido is finished", async function() {
      beforeEach(async function() {
        const totalAmt = await ido.totalAmount();
        const purchaseAmount = totalAmt.mul(await ido.salePrice()).div(gwei).div(2);
        for (let b of [buyer, team]) {
          await dai.mint(b.address, eth.mul(1e6)).then(tx=>tx.wait());
          await dai.connect(b).approve(ido.address, largeApproval).then(tx=>tx.wait());
          await ido.connect(b).purchase(purchaseAmount).then(tx=>tx.wait());
        }
        await ido.disableWhiteList().then(tx=>tx.wait());

        await bootstrap(dai, config, deployed);
        deployedBonds = await deployBonds(dai, pair, config, deployed);
        await bootstrapBonds(dai, pair, config, deployed, deployedBonds);
        balBefore = await dai.balanceOf(team.address);

        await network.provider.send("evm_increaseTime", [publicSaleSeconds])
        await network.provider.send("evm_mine")

        await deployed.treasury.pushManagement(finalizer.address).then(tx=>tx.wait());
      })

      it("requires a reasonable amount of gas", async function() {
        let tx = await finalizer.finalize();
        await tx.wait();
        let receipt = await ethers.provider.getTransactionReceipt(tx.hash);
        console.log("gas for finalize ", receipt.gasUsed.toString())
        expect(receipt.gasUsed).to.lt(1e6);
      })

      describe("finalize", async function() {
        beforeEach(async function() {
          await finalizer.finalize().then(tx=>tx.wait());
        })

        it("finalizes the IDO", async function() {
          expect(await ido.finalized()).to.eq(true);
        })

        it("returns ownership", async function() {
          await deployed.treasury.pullManagement().then(tx=>tx.wait());
          expect(await deployed.treasury.manager()).to.eq(deployer.address);
        })

        it("revokes its treasury priviledges", async function() {
          expect(await deployed.treasury.isReserveDepositor(ido.address)).to.eq(false);
          expect(await deployed.treasury.isReserveDepositor(finalizer.address)).to.eq(false);
          expect(await deployed.treasury.isLiquidityDepositor(ido.address)).to.eq(false);
          expect(await deployed.treasury.isLiquidityDepositor(finalizer.address)).to.eq(false);
        })

        it("cannot finalize twice", async function() {
          await expect(finalizer.finalize())
            .to.revertedWith("Already finalized");
        })

        it("deposits the reserve in the treasury", async function() {
          const amountSold = totalNativeForSale.sub(await ido.amountRemaining());
          const reservePercent = ethers.BigNumber.from('10000').sub(lpPercent).sub(teamPercent);
          const expected = amountSold.mul(salePrice).mul(reservePercent).div(1e4).div(1e9)
          expect(await dai.balanceOf(deployed.treasury.address)).to.eq(expected);
        })

        it("deposits the LP in the treasury", async function() {
          let p = await DAI.attach(pair, deployer);
          expect(await p.balanceOf(deployed.treasury.address)).to.eq('189120129435313209');
        })

        it("sends reserve to the team", async function() {
          const amountSold = totalNativeForSale.sub(await ido.amountRemaining());
          const expected = amountSold.mul(salePrice).mul(teamPercent).div(1e4).div(1e9)

          const balAfter = await dai.balanceOf(team.address);
          const received = (balAfter).sub(balBefore);
          expect(received).to.eq(expected);
        })
      })
    })
  })
})

