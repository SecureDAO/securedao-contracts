const { ethers, BigNumber } = require("hardhat");
const fs = require('fs')
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

async function main() {
    const largeApproval = '100000000000000000000000000000000';
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const eth = ethers.BigNumber.from(10).pow(18)
    const gwei = ethers.BigNumber.from(10).pow(9)

    const [deployer] = await ethers.getSigners();
    console.log("deploying with address ", deployer.address);
    const team = deployer;
    // Deploy DAI
    const DAI = await ethers.getContractFactory('DAI');
    const dai = await DAI.deploy( 0 );
    await dai.deployed();
    await dai.mint( deployer.address, eth.mul(1e6) );

    const Factory = await ethers.getContractFactory('Factory');
    const factory = await Factory.deploy(zeroAddress);
    await factory.deployed();

    console.log("reserve ", dai.address);
    console.log("factory ", factory.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


