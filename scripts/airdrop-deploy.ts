import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";

async function main() {
  console.log("starting")
  const [deployer] = await ethers.getSigners();
  console.log("deploying with address ", deployer.address);
  const Airdrop = await ethers.getContractFactory("Airdrop");
  const airdrop = await Airdrop.deploy(addresses.scr);
  await airdrop.deployed();

  console.log("airdrop address ", airdrop.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})
