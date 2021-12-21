const { ethers } = require("hardhat");
const fs = require('fs')
const erc20ABI = fs.readFileSync('./abi/ERC20.json', 'utf8')
const { addresses, contracts } = require("./constants.js");
const { BondDepositoryDeployer } = require('../utils/deploy.js');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("deploying with address ", deployer.address);

    const eth = ethers.BigNumber.from(10).pow(18);
    const gwei = ethers.BigNumber.from(10).pow(9);
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    const daoAddress = '0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88';
    const team = '0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157';
    const DAIAddress = '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e';

    // Bond vesting length in seconds (5 days)
    const bondVestingLengthSeconds = 3600 * 24 * 5;
    // MIM bond BCV
    const daiBondBCV = 100;
    // Min bond price
    const minBondPriceReserve = 2000;
    // Max bond payout
    const maxBondPayout = 410; // 0.41%
    // DAO fee for bond
    const bondFee = 1000; // 10%
    // Max debt bond can take on
    const maxBondDebtReserve = gwei.mul(30000);
    // Initial Bond debt
    const initialBondDebt = 0;

    const reserve = new ethers.Contract(DAIAddress, erc20ABI, deployer);
    const staking = (await ethers.getContractFactory("SecureStaking")).attach(addresses.staking);
    const stakingHelper = (await ethers.getContractFactory("StakingHelper")).attach(addresses.stakingHelper);
    const scr = (await ethers.getContractFactory("SecureERC20Token")).attach(addresses.scr);
    const treasury = (await ethers.getContractFactory("SecureTreasury")).attach(addresses.treasury);

    const daiBond = await new BondDepositoryDeployer(
      deployer,
      scr,
      treasury,
      reserve.address,
      zeroAddress,
      addresses.multisig,
    ).deploy()

    await daiBond.initializeBondTerms(
      daiBondBCV, minBondPriceReserve,
      maxBondPayout, bondFee, maxBondDebtReserve,
      initialBondDebt, bondVestingLengthSeconds
    ).then(tx => tx.wait());

    // Set staking for DAI bond
    await daiBond.setStaking(staking.address, false).then(tx => tx.wait());

    console.log("bond deployed to ", daiBond.address);
    await daiBond.bondPriceInUSD().then(price => console.log("bond price USD ", price));

    try {
      await hre.run("verify:verify", {
        address: daiBond.address,
        constructorArguments: [
          scr.address,
          reserve.address,
          treasury.address,
          daoAddress,
          zeroAddress,
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



