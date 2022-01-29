import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import { ChainlinkBondingCalculatorDeployer, BondDepositoryV2Deployer } from "../utils/deploy-ts";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("deploying with address ", deployer.address);

    const eth = ethers.BigNumber.from(10).pow(18);
    const gwei = ethers.BigNumber.from(10).pow(9);
    const zeroAddress = ethers.constants.AddressZero;

    //let wsSCR = await (await ethers.getContractFactory("WrappedStakedSecureERC20")).deploy(
    //  "0x27Eef8DC26A6747C54cB74e18665B0734d533a17",
    //);
    //await wsSCR.deployed();
    //console.log("deployed to ", wsSCR.address);

    //await new Promise(r => setTimeout(r, 2000));
    try {
      await hre.run("verify:verify", {
        address: "0xA7727db8DB5afcA6d88eb7FB9E8e322dc043325a",
        constructorArguments: [
          "0x27Eef8DC26A6747C54cB74e18665B0734d533a17"
        ],
      });
    } catch (error) {
      console.log("couldn't verify", error);
    }

}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


