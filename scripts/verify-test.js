const { ethers, BigNumber } = require("hardhat");
const fs = require('fs')
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

async function main() {
    const largeApproval = '100000000000000000000000000000000';
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const eth = ethers.BigNumber.from(10).pow(18)
    const gwei = ethers.BigNumber.from(10).pow(9)

    const [deployer] = await ethers.getSigners();

    const DAI = await ethers.getContractFactory('DAI');
    const dai = await DAI.deploy( 0 );
    await dai.deployed();

    await hre.run("verify:verify", {
    address: dai.address,
    constructorArguments: [
      0,
    ],
  });
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})

