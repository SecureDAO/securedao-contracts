const { ethers } = require("hardhat");
const fs = require('fs')
const chai = require("chai");
const expect = chai.expect;
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

chai.use(require('chai-as-promised'))

describe("IDO", function () {
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
      buyer,
      buyer2,
      finalizer,
      team,
      caller,
      dai,
      scr,
      sscr,
      factory,
      weth,
      router,
      firstEpochTimeUnixSeconds,
      salePrice,
      deployed,
      config
    ;


  beforeEach(async function () {
    [deployer, team, buyer, buyer2, finalizer] = await ethers.getSigners();

    firstEpochTimeUnixSeconds = Math.round(Date.now() / 1000) + 1800;;
    // Deploy DAI
    const DAI = await ethers.getContractFactory('DAI');
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
    deployed = await deployContracts(config, dai);
    scr = deployed.scr;
    sscr = deployed.sscr;
  })

  it("Deploys successfully", async function () {
    const IDO = await ethers.getContractFactory('IDO');
    const totalNativeForSale = gwei.mul(1000);
    salePrice = eth.mul(100);

    const startOfSale = '1';
    const publicSaleAlloc = gwei.mul(500).mul(1e9).div(salePrice);
    const args = [
      dai.address,
      deployed.staking.address,
      deployer.address,
      totalNativeForSale,
      salePrice,
      startOfSale,
      publicSaleAlloc,
      100,
    ]
    const deploymentData = IDO.interface.encodeDeploy(args)
    const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData });
    const ido = await IDO.deploy(...args);
    await ido.deployed();

    expect(ethers.BigNumber.from(estimatedGas).toNumber()).to.be.lessThan(1e6);
  })

  describe('interactions', async function() {
    let ido;

    beforeEach(async function() {

      const IDO = await ethers.getContractFactory('IDO');
      const totalNativeForSale = gwei.mul(1000);
      const salePrice = eth.mul(100);

      const startOfSale = '1';
      const publicSaleAlloc = gwei.mul(200);
      const args = [
        dai.address,
        deployed.staking.address,
        deployer.address,
        totalNativeForSale,
        salePrice,
        startOfSale,
        publicSaleAlloc,
        100,
      ]
      ido = await IDO.deploy(...args);
      await ido.deployed();
      await ido.setFinalizer(finalizer.address).then(tx=>tx.wait());
    })

    describe("the sale has not started", async function () {
      describe("the caller is the finalizer", async function () {
        beforeEach(function() {
          caller = finalizer;
        })

        it("Cannot finalize the sale unless the sale is closed", async function() {
          await ido.deployed();

          await expect(ido.connect(caller).finalize(scr.address))
            .to.be.revertedWith('Sale must be closed');
        })

        it("Cannot close the sale early", async function() {
          await ido.deployed();

          await expect(ido.connect(caller).closeSale())
            .to.be.revertedWith('Need all native to be sold');
        })
      })

      describe("the sale has started with multiple whitelisters", async function() {
        beforeEach(async function() {
          await ido.whiteListBuyers([buyer.address, team.address]).then(tx=>tx.wait());
          await ido.initialize();
        })

        describe("the caller is non priviledged but is whitelisted", async function () {
          beforeEach(async function() {
            caller = buyer;
            await dai.mint(caller.address, eth.mul(1e6)).then(tx=>tx.wait());
            await dai.connect(caller).approve(ido.address, largeApproval).then(tx=>tx.wait());
          })

          it("allotment is divided among whitelisters", async function() {
            await dai.mint(buyer.address, eth.mul(1e6)).then(tx=>tx.wait());
            await dai.connect(buyer).approve(ido.address, largeApproval).then(tx=>tx.wait());

            await dai.mint(team.address, eth.mul(1e6)).then(tx=>tx.wait());
            await dai.connect(team).approve(ido.address, largeApproval).then(tx=>tx.wait());

            const totalAmt = await ido.totalAmount();

            expect(await ido.connect(caller).getAllotmentPerBuyer()).to.equal(totalAmt.div(2));
            const purchaseAmt = totalAmt.mul(await ido.salePrice()).div(gwei).div(4);
            await ido.connect(buyer).purchase(purchaseAmt).then(tx=>tx.wait());
            const remaining = totalAmt.mul(3).div(4);
            expect(await ido.connect(caller).amountRemaining()).to.equal(remaining);
          })

          describe("the sale has been opened to the public", async function() {
            beforeEach(async function() {
              await ido.deployed();

              await dai.mint(buyer.address, eth.mul(1e6)).then(tx=>tx.wait());
              await dai.connect(buyer).approve(ido.address, largeApproval).then(tx=>tx.wait());

              await dai.mint(team.address, eth.mul(1e6)).then(tx=>tx.wait());
              await dai.connect(team).approve(ido.address, largeApproval).then(tx=>tx.wait());

              const totalAmt = await ido.totalAmount();

              const purchaseAmt = totalAmt.mul(await ido.salePrice()).div(gwei).div(8);
              await ido.connect(buyer).purchase(purchaseAmt).then(tx=>tx.wait());

              await ido.disableWhiteList().then(tx=>tx.wait());
            })

            it("public purchase amount must be public sale amount or less", async function() {
              await ido.deployed();

              await dai.mint(buyer2.address, eth.mul(1e6)).then(tx=>tx.wait());
              await dai.connect(buyer2).approve(ido.address, largeApproval).then(tx=>tx.wait());

              const remainingAmt = await ido.amountRemaining();
              const publicSaleAmount = await ido.publicSaleAmount();
              expect(remainingAmt).to.gt(publicSaleAmount);

              await expect(ido.connect(buyer2).purchase(remainingAmt.mul(salePrice).div(gwei)))
                .to.be.revertedWith('More than allotted');
            })

            it("a non whitelisted address can buy", async function() {
              await ido.deployed();

              await dai.mint(buyer2.address, eth.mul(1e6)).then(tx=>tx.wait());
              await dai.connect(buyer2).approve(ido.address, largeApproval).then(tx=>tx.wait());

              const remainingAmt = await ido.amountRemaining();
              const publicSaleAmount = await ido.publicSaleAmount();
              let purchaseAmount;
              if (remainingAmt < publicSaleAmount) {
                purchaseAmount = remainingAmt;
              } else {
                purchaseAmount = publicSaleAmount;
              }
              await ido.connect(buyer2).purchase(purchaseAmount).then(tx=>tx.wait());
            })
            // Cannot claim before sale has been finalized
            it("cannot claim early", async function() {
              await ido.deployed();

              await dai.mint(buyer2.address, eth.mul(1e6)).then(tx=>tx.wait());
              await dai.connect(buyer2).approve(ido.address, largeApproval).then(tx=>tx.wait());

              const remainingAmt = await ido.amountRemaining();
              const publicSaleAmount = await ido.publicSaleAmount();
              let purchaseAmount;
              if (remainingAmt < publicSaleAmount) {
                purchaseAmount = remainingAmt;
              } else {
                purchaseAmount = publicSaleAmount;
              }
              await ido.connect(buyer2).purchase(purchaseAmount).then(tx=>tx.wait());
              await expect(ido.connect(buyer2).claim())
                .to.be.revertedWith('Can only claim after IDO has been finalized');
            })
            // After sale has been finalized
            describe("the sale has been closed", async function() {
              beforeEach(async function() {
                await ido.deployed();

                for (let i = 0; i < 110; i++) {
                  await network.provider.send("evm_mine");
                }
                await ido.connect(finalizer).closeSale().then(tx=>tx.wait());
              })

              it("buyers cannot claim early", async function() {

                await expect(ido.connect(buyer2).claim())
                  .to.be.revertedWith('Can only claim after IDO has been finalized');
              })

              it("sale cannot be finalized unless the contract receive the correct amount of SCR", async function (){
                  await ido.deployed();
                  await scr.setVault(deployer.address).then(tx=>tx.wait());
                  await scr.mint(caller.address, gwei.mul(1e6)).then(tx=>tx.wait());

                  let amt = (await ido.totalAmount());
                  await scr.connect(caller).transfer(ido.address, amt).then(tx=>tx.wait());
                  await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());
                  await bootstrap(dai, config, deployed);

                  await expect(ido.connect(finalizer).finalize(scr.address))
                    .to.revertedWith("Did not receive the correct number of native tokens");
              })

              describe("the sale is finalzied", async function() {
                beforeEach(async function() {
                  await ido.deployed();
                  await scr.setVault(deployer.address).then(tx=>tx.wait());
                  await scr.mint(caller.address, gwei.mul(1e6)).then(tx=>tx.wait());

                  let amt = (await ido.totalAmount()).sub(await ido.amountRemaining());
                  await scr.connect(caller).transfer(ido.address, amt).then(tx=>tx.wait());
                  await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());
                  await bootstrap(dai, config, deployed);

                  await ido.connect(finalizer).finalize(scr.address).then(tx=>tx.wait());
                })

                it("buyers can claim", async function() {
                  await ido.connect(buyer).claim().then(tx=>tx.wait());
                })

                it("there is no SCR left in the contract after all claims", async function() {
                  let numBuyers = await ido.numBuyers();
                  let s = await ethers.getSigners();
                  let signers = {}
                  for (let signer of s) {
                    signers[signer.address] = signer
                  }
                  for (let i = 0; i < numBuyers; i++) {
                    let b = await ido.buyers(i);
                    await ido.connect(signers[b]).claim().then(tx=>tx.wait());
                  }

                  let bal = await scr.balanceOf(ido.address);
                  expect(bal).to.eq(0);
                })

                it("buyers have their tokens staked", async function() {
                  await ido.connect(buyer).claim().then(tx=>tx.wait());
                  let balWarmup = await sscr.balanceOf(deployed.stakingWarmup.address);
                  let gons = (await deployed.staking.warmupInfo(buyer.address)).gons;
                  let balForGons = await sscr.balanceForGons(gons);

                  expect(balForGons).to.eq(balWarmup);

                  await deployed.staking.connect(buyer).claim(buyer.address).then(tx=>tx.wait());
                  let stakedBal = await sscr.balanceOf(buyer.address);

                  expect(stakedBal).to.eq(gwei.mul(125));
                })

                it("cannot claim unless they bought", async function() {
                  await expect(ido.connect(buyer2).claim())
                    .to.be.revertedWith("None purchased");
                })
              })
            })
          })
        })
      })

      describe("the sale has started", async function() {
        describe("the caller is the only whitelisted address", async function () {
          beforeEach(async function() {
            await ido.whiteListBuyers([buyer.address]).then(tx=>tx.wait());
            await ido.initialize();

            caller = buyer;
            await dai.mint(caller.address, eth.mul(1e6)).then(tx=>tx.wait());
            await dai.connect(caller).approve(ido.address, largeApproval).then(tx=>tx.wait());
          })

          it("a single whitelister gets the full allotment", async function() {
            await dai.mint(caller.address, eth.mul(1e6)).then(tx=>tx.wait());
            await dai.connect(caller).approve(ido.address, largeApproval).then(tx=>tx.wait());

            const totalAmt = await ido.totalAmount();

            expect(await ido.connect(caller).getAllotmentPerBuyer()).to.equal(totalAmt);
            await ido.connect(caller).purchase(totalAmt.mul(await ido.salePrice()).div(gwei)).then(tx=>tx.wait());
            expect(await ido.connect(caller).amountRemaining()).to.equal(0);
          })
        })

        describe("the caller is non priviledged but is whitelisted", async function () {
          beforeEach(async function() {
            await ido.whiteListBuyers([buyer.address, buyer2.address]).then(tx=>tx.wait());
            await ido.initialize();
            caller = buyer;
            await dai.mint(caller.address, eth.mul(1e6)).then(tx=>tx.wait());
            await dai.connect(caller).approve(ido.address, largeApproval).then(tx=>tx.wait());
          })

          it("can buy their fair share", async function() {
            await dai.mint(caller.address, eth.mul(1e6)).then(tx=>tx.wait());
            await dai.connect(caller).approve(ido.address, largeApproval).then(tx=>tx.wait());

            const totalAmt = await ido.totalAmount();

            expect(await ido.connect(caller).getAllotmentPerBuyer()).to.equal(totalAmt.div(2));
            await ido.connect(caller).purchase(totalAmt.mul(await ido.salePrice()).div(gwei).div(2)).then(tx=>tx.wait());
          })

          describe("the sale is canceled", async function () {
            let purchaseAmount;

            beforeEach(async function() {
              const totalAmt = await ido.totalAmount();

              purchaseAmount = totalAmt.mul(await ido.salePrice()).div(gwei).div(2);
              for (let b of [buyer, buyer2]) {
                await dai.mint(b.address, eth.mul(1e6)).then(tx=>tx.wait());
                await dai.connect(b).approve(ido.address, largeApproval).then(tx=>tx.wait());
                await ido.connect(b).purchase(purchaseAmount).then(tx=>tx.wait());
              }

              await ido.cancel().then(tx=>tx.wait());
            })

            it("users who didn't buy, can't withdraw", async function () {
              await expect(ido.connect(team).withdraw())
                .to.revertedWith("Nothing to withdraw");
            })

            it("lets users withdraw their funds", async function () {
              for (let b of [buyer, buyer2]) {
                let balBefore = await dai.balanceOf(b.address);
                await ido.connect(b).withdraw().then(tx=>tx.wait());
                let balAfter = await dai.balanceOf(b.address);
                expect(balAfter.sub(balBefore)).to.eq(purchaseAmount);
              }
            })
          })
        })

        describe("the caller is the finalizer", async function () {
          beforeEach(async function() {
            caller = finalizer;
            await ido.whiteListBuyers([buyer.address, buyer2.address]).then(tx=>tx.wait());
            await ido.initialize();
          })

          describe("all tokens have been sold", async function() {
            beforeEach(async function() {
              const totalAmt = await ido.totalAmount();

              purchaseAmount = totalAmt.mul(await ido.salePrice()).div(gwei).div(2);
              for (let b of [buyer, buyer2]) {
                await dai.mint(b.address, eth.mul(1e6)).then(tx=>tx.wait());
                await dai.connect(b).approve(ido.address, largeApproval).then(tx=>tx.wait());
                await ido.connect(b).purchase(purchaseAmount).then(tx=>tx.wait());
              }
            })

            it("Can close the sale", async function() {
              await ido.deployed();

              await ido.connect(caller).closeSale().then(tx=>tx.wait());
            })

            describe("the sale has been closed", async function() {
              beforeEach(async function() {
                await ido.deployed();

                await ido.connect(caller).closeSale().then(tx=>tx.wait());
              })

              it("Cannot finalize the sale without sending native tokens to the ido", async function() {
                await ido.deployed();

                await expect(ido.connect(caller).finalize(scr.address))
                  .to.be.revertedWith('Did not receive the correct number of native tokens');
              })

              it("Cannot finalize the sale without sending the correct amount of native tokens to the ido", async function() {
                await ido.deployed();
                await scr.setVault(deployer.address).then(tx=>tx.wait());
                await scr.mint(caller.address, gwei.mul(1e6)).then(tx=>tx.wait());
                await scr.connect(caller).transfer(ido.address, gwei).then(tx=>tx.wait());
                await expect(ido.connect(caller).finalize(scr.address))
                  .to.be.revertedWith('Did not receive the correct number of native tokens');
              })

              it("Can finalize the sale after sending native tokens to the ido", async function() {
                await ido.deployed();
                await scr.setVault(deployer.address).then(tx=>tx.wait());
                await scr.mint(caller.address, gwei.mul(1e6)).then(tx=>tx.wait());
                await scr.connect(caller).transfer(ido.address, await ido.totalAmount()).then(tx=>tx.wait());
                ido.connect(caller).finalize(scr.address).then(tx=>tx.wait());
              })
            })
          })
        })
      })
    })

    describe("caller is owner", async function () {
      beforeEach(function() {
        caller = deployer;
      })

      it("Can add addresses to the whitelist", async function () {
        await ido.deployed();
        const buyers = [buyer.address];

        await ido.connect(caller).whiteListBuyers(buyers).then(tx=>tx.wait());
      })

      it("Can disable the whitelist", async function () {
        await ido.deployed();

        await ido.connect(caller).disableWhiteList().then(tx=>tx.wait());
      })

      it("Can cancel the sale", async function () {
        await ido.deployed();

        await ido.connect(caller).cancel().then(tx=>tx.wait());
      })

      it("Can initialize the sale", async function () {
        await ido.deployed();

        await ido.connect(caller).initialize().then(tx=>tx.wait());
      })

      it("Can set the finalizer", async function () {
        await ido.deployed();

        await ido.connect(caller).setFinalizer(buyer.address).then(tx=>tx.wait());
      })

      it("Cannot finalize the sale", async function() {
        await ido.deployed();

        await expect(ido.connect(caller).finalize(scr.address))
          .to.be.revertedWith('Can only be called by the finalizer');
      })
    })

    describe("caller is non priviledged", async function () {
      beforeEach(function() {
        caller = buyer;
      })

      it("Cannot add addresses to the whitelist", async function () {
        await ido.deployed();
        const buyers = [buyer.address];

        await expect(ido.connect(caller).whiteListBuyers(buyers))
          .to.be.revertedWith('Ownable: caller is not the owner');
      })

      it("Cannot disable the whitelist", async function () {
        await ido.deployed();

        await expect(ido.connect(caller).disableWhiteList())
          .to.be.revertedWith('Ownable: caller is not the owner');
      })

      it("Cannot cancel the sale", async function () {
        await ido.deployed();

        await expect(ido.connect(caller).cancel())
          .to.be.revertedWith('Ownable: caller is not the owner');
      })

      it("Cannot initialize the sale", async function () {
        await ido.deployed();

        await expect(ido.connect(caller).initialize())
          .to.be.revertedWith('Ownable: caller is not the owner');
      })

      it("Cannot set the finalizer", async function () {
        await ido.deployed();

        await expect(ido.connect(caller).setFinalizer(buyer.address))
          .to.be.revertedWith('Ownable: caller is not the owner');
      })

      it("Cannot finalize the sale", async function() {
        await ido.deployed();

        await expect(ido.connect(caller).finalize(scr.address))
          .to.be.revertedWith('Can only be called by the finalizer');
      })
    })
  })
})
