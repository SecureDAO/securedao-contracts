import hre from "hardhat";
import { ethers } from "hardhat";
import { addresses, contracts } from "./constants";
import { ChainlinkBondingCalculatorDeployer, BondDepositoryV2Deployer } from "../utils/deploy-ts";
const BigNumber = ethers.BigNumber;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("deploying with address ", deployer.address);

    const eth = ethers.BigNumber.from(10).pow(18);
    const gwei = ethers.BigNumber.from(10).pow(9);
    const zeroAddress = ethers.constants.AddressZero;

    const daoAddress = addresses.multisig;
    const team = addresses.team;
    const principleAddress = addresses.wftm;
    const feedAddress = addresses.wftmUsdcPriceFeed;

    // Bond vesting length in seconds (5 days)
    const bondVestingLengthSeconds = 3600 * 24 * 5;
    // bond BCV
    const bondBCV = 4000;
    // Min bond price
    const minBondPrice = 1000;
    // Max bond payout
    const maxBondPayout = 410; // 0.41%
    // DAO fee for bond
    const bondFee = 1000; // 10%
    // Max debt bond can take on
    const maxBondDebt = gwei.mul(30000);
    // Initial Bond debt
    const initialBondDebt = 0;

    const staking = (await ethers.getContractFactory("SecureStaking")).attach(addresses.staking);
    const scr = (await ethers.getContractFactory("SecureERC20Token")).attach(addresses.scr);
    const treasury = (await ethers.getContractFactory("SecureTreasury")).attach(addresses.treasury);

    const chainlinkBondingCalculator = await new ChainlinkBondingCalculatorDeployer(deployer, scr).deploy();

    // Deploy bond
    const bond = await new BondDepositoryV2Deployer(
      deployer,
      scr,
      treasury,
      principleAddress,
      chainlinkBondingCalculator.address,
      daoAddress
    ).deploy();

    // Set LP bond terms
    let tx = await bond.initializeBondTerms(
      bondBCV, minBondPrice, maxBondPayout,
      bondFee, maxBondDebt, initialBondDebt,
      bondVestingLengthSeconds
    );
    tx.wait();

    // Set staking for bond
    tx = await bond.setStaking(staking.address);
    tx.wait();


    await chainlinkBondingCalculator.updatePriceFeed(principleAddress, feedAddress);

    console.log("chainlink calc ", chainlinkBondingCalculator.address)
    console.log("bond deployed to ", bond.address);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})

