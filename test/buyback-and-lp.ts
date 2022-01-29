import { ethers } from "hardhat";
import * as fs from "fs";
import * as chai from "chai";
const expect = chai.expect;

chai.use(require('chai-as-promised'))

describe("BuybackAndLP", () => {
  it("does stuff", async () => {
    const largeApproval = '100000000000000000000000000000000';
    const eth = ethers.constants.WeiPerEther;

    let [deployer] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('DAI');
    const dai = await Token.deploy( 0 );
    await dai.deployed();
    await dai.mint( deployer.address, eth.mul(1e6) );

    const mim = await Token.deploy( 0 );
    await mim.deployed();

    const scr = await Token.deploy( 0 );
    await scr.deployed();

    const MockVault = await ethers.getContractFactory("MockBalancerVault");
    const vault = await MockVault.deploy();
    await vault.deployed();

    const lp = await Token.deploy( 0 );
    await lp.deployed();
    await lp.mint( vault.address, eth.mul(1e6) );

    await mim.mint(vault.address, eth.mul(1e6));
    await scr.mint(vault.address, eth.mul(1e6));
    let poolID = "0xc4dac57a46a0a1acd0eb95eddef5257926279960000200000000000000000150"
    let tx = await vault.updatePoolInfo(poolID, [mim.address, scr.address], [eth.mul(6), eth.mul(7)], lp.address);
    tx.wait();

    let C = await ethers.getContractFactory("SwapAndLP");
    let buyback = await C.deploy(dai.address, vault.address, poolID);
    await buyback.deployed();

    tx = await dai.approve(buyback.address, largeApproval);
    tx.wait();

    let balB4 = await dai.balanceOf(deployer.address);
    let buybackAmount = eth.mul(10);

    await buyback.execute(buybackAmount, deployer.address);
    let balAfter = await dai.balanceOf(deployer.address);

    expect(balB4.sub(balAfter)).to.eq(buybackAmount);
    expect(await dai.balanceOf(buyback.address)).to.eq(0);
    expect(await lp.balanceOf(deployer.address)).to.eq(eth.mul(10));
  })
})



