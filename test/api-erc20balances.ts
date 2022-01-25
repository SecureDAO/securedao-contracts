import { ethers } from "hardhat";
import * as fs from "fs";
import * as chai from "chai";
const expect = chai.expect;

chai.use(require('chai-as-promised'))

describe("ERC20Balances", () => {
  it("does stuff", async () => {
    const largeApproval = '100000000000000000000000000000000';
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const eth = ethers.BigNumber.from(10).pow(18)
    const gwei = ethers.BigNumber.from(10).pow(9)

    let [deployer] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('DAI');
    const dai = await Token.deploy( 0 );
    await dai.deployed();
    await dai.mint( deployer.address, eth.mul(1e6) );

    const mim = await Token.deploy( 0 );
    await mim.deployed();
    await mim.mint( deployer.address, eth.mul(1e5) );

    let Balances = await ethers.getContractFactory("ERC20Balances");
    let balances = await Balances.deploy();
    await balances.deployed();

    let deployerBalances = await balances.balances(deployer.address, [dai.address, mim.address])

    expect(deployerBalances[0]).to.eq(eth.mul(1e6));
    expect(deployerBalances[1]).to.eq(eth.mul(1e5));
  })
})


