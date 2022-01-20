import * as hre from "hardhat";
import { ethers } from "hardhat";
import {  UniswapV2OracleDeployer } from "../../utils/deploy-ts";

async function main() {
  const [deployer] = await ethers.getSigners();

  const factoryAddress = "0x152eE697f2E276fA89E96742e9bB9aB1F2E61bE3"; // SpookySwap
  const beetsAddress = "0xf24bcf4d1e507740041c9cfd2dddb29585adce1e";
  const wftmAddress = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83";
  //let oracle = await new UniswapV2OracleDeployer(deployer, factoryAddress, beetsAddress, wftmAddress).deploy();
  //await oracle.deployed();

  //console.log("oracle deployed to ", oracle.address);

  try {
    await hre.run("verify:verify", {
      address: "0xF0dB6BCe95B3c0C4439C74a70bA0e296f8b645E2",
      constructorArguments: [
        factoryAddress,
        beetsAddress,
        wftmAddress,
      ],
    });
  } catch (error) {
    console.log("couldn't verify dai bond ", error);
  }
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})

