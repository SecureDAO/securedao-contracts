import { ethers } from "hardhat";
import * as fs from "fs";
import * as chai from "chai";
import { LiquidTokenDeployer, StakedTokenDeployer, StakingDeployer, TreasuryDeployer, DistributorDeployer } from "../utils/deploy-ts";
const expect = chai.expect;

chai.use(require('chai-as-promised'))

describe("wsSCR", () => {
  it("does stuff", async () => {
    const largeApproval = '100000000000000000000000000000000';
    const eth = ethers.constants.WeiPerEther;
    const gwei = ethers.BigNumber.from(1e9);

    let [deployer] = await ethers.getSigners();

    const DAI = await ethers.getContractFactory('DAI');
    const dai = await DAI.deploy( 0 );
    await dai.deployed();
    await dai.mint(deployer.address, eth.mul(10000))
    let scr = await new LiquidTokenDeployer(deployer).deploy();
    let sscr = await new StakedTokenDeployer(deployer).deploy();
    let epochLengthInSeconds = 600;
    let firstEpochNumber = 1;
    let firstEpochTimeUnixSeconds = 0;
    const initialRewardRate = 30000; // 3%
    const staking = await new StakingDeployer(
      deployer,
      scr.address,
      sscr.address,
      epochLengthInSeconds,
      firstEpochNumber,
      firstEpochTimeUnixSeconds
    ).deploy();

    const treasury = await new TreasuryDeployer(deployer, dai.address, scr.address).deploy();
    const distributor = await new DistributorDeployer(
      deployer,
      treasury.address,
      scr.address,
      epochLengthInSeconds,
      firstEpochTimeUnixSeconds
    ).deploy();

    let tx = await sscr.initialize(staking.address);
    tx.wait();
    tx = await sscr.setIndex(gwei);
    tx.wait();
    tx = await scr.setVault(treasury.address);
    tx.wait();
    tx = await staking.setContract('0', distributor.address);
    tx.wait();
    tx = await distributor.addRecipient(staking.address, initialRewardRate);
    tx.wait();
    tx = await treasury.queue('0', deployer.address);
    tx.wait();
    tx = await treasury.toggle('0', deployer.address, ethers.constants.AddressZero);
    tx.wait();
    //tx = await treasury.queue('2', dai.address);
    //tx.wait();
    //tx = await treasury.toggle('2', dai.address, ethers.constants.AddressZero);
    //tx.wait();
    console.log(await treasury.isReserveToken(dai.address));
    tx = await treasury.queue('8', distributor.address);
    tx.wait();
    tx = await treasury.toggle('8', distributor.address, ethers.constants.AddressZero);
    tx.wait();
    let wsSCR = await (await ethers.getContractFactory("WrappedStakedSecureERC20")).deploy(
      sscr.address,
    );
    await wsSCR.deployed();
    tx = await dai.approve(treasury.address, largeApproval);
    tx.wait()
    tx = await scr.approve(staking.address, largeApproval);
    tx.wait()
    tx = await treasury.deposit(eth.mul(2), dai.address, gwei);
    tx.wait()
    tx = await staking.stake(gwei, deployer.address);
    tx.wait();

    expect(await sscr.index()).to.eq(gwei)
    expect(await wsSCR.wrappedToUnwrapped(eth)).to.eq(gwei)

    tx = await staking.rebase();
    tx.wait();

    expect(await sscr.index()).to.eq(gwei.mul(103).div(100))
    expect(await wsSCR.wrappedToUnwrapped(eth)).to.eq(gwei.mul(103).div(100))
  })
})



