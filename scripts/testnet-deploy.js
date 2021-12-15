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

    const WETH = await ethers.getContractFactory('WETH', deployer);
    const weth = await WETH.deploy();
    const Router = await ethers.getContractFactory('Router', deployer);

    const router = await Router.deploy(factory.address, weth.address);
    await router.deployed();


    // First block epoch occurs
    const firstEpochTimeUnixSeconds = Math.round(Date.now() / 1000) + 1800;
    // What epoch will be first epoch
    const firstEpochNumber = '0';
    // How many blocks are in each epoch
    const epochLengthInSeconds = ethers.BigNumber.from('3600');
    // Initial reward rate for epoch
    const initialRewardRate = '3000';
    // DAI bond BCV
    const daiBondBCV = '369';
    // Bond vesting length in blocks. 33110 ~ 5 days
    const bondVestingLengthSeconds = '3600';
    // Min bond price
    const minBondPrice = '200';
    // Max bond payout
    const maxBondPayout = 1e9;
    // DAO fee for bond
    const bondFee = '1000';
    // Max debt bond can take on
    const maxBondDebt = '1000000000000000';
    // Initial Bond debt
    const initialBondDebt = '0'
    // how much scr to mint initially
    const initialSCR = gwei.mul(1000);
    const initialPrice = 100;
    const initialIndex = gwei;

    const config = {
      dao: deployer.address,
      firstEpochTimeUnixSeconds: firstEpochTimeUnixSeconds,
      firstEpochNumber: firstEpochNumber,
      epochLengthInSeconds: epochLengthInSeconds,
      initialRewardRate: initialRewardRate,
      bondVestingLengthSeconds: bondVestingLengthSeconds,
      maxBondPayout: maxBondPayout,
      initialBondDebt: initialBondDebt,
      initialIndex: initialIndex,
      bondFee: bondFee,
      daiBondBCV: daiBondBCV,
      lpBondBCV: daiBondBCV,
      minBondPriceLP: minBondPrice,
      minBondPriceReserve: minBondPrice,
      maxBondDebtReserve: maxBondDebt,
      maxBondDebtLP: maxBondDebt,
      deployer: deployer,
    }

    // Deploy contracts
    let deployed = await deployContracts(config, dai);

    // Finish contract set up
    await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());
    await bootstrap(dai, config, deployed);
    await factory.createPair(deployed.scr.address, dai.address).then(tx => tx.wait());
    const scrDaiLPAddress = await factory.getPair(deployed.scr.address, dai.address);
    const deployedBonds = await deployBonds(dai, scrDaiLPAddress, config, deployed);
    console.log("bar");
    await bootstrapBonds(dai, scrDaiLPAddress, config, deployed, deployedBonds);
console.log("foo");

    const IDO = await ethers.getContractFactory('IDO');
    const totalNativeForSale = gwei.mul(1000);
    salePrice = eth.mul(100);

    const Finalizer = await ethers.getContractFactory('Finalizer', deployer);
    finalizer = await Finalizer.deploy(
      deployed.treasury.address,
      deployed.staking.address,
      team.address,
      factory.address,
      deployed.olympusBondingCalculator.address
    );
    await finalizer.deployed()

    const block = await ethers.provider.getBlock("latest");
    console.log("block timestamp ", block.timestamp)
    const startOfSale = block.timestamp + (60*1);
    const publicSaleAlloc = gwei.mul(5);
    const args = [
      dai.address,
      deployed.staking.address,
      finalizer.address,
      totalNativeForSale,
      salePrice,
      startOfSale,
      publicSaleAlloc,
    ]
    const ido = await IDO.deploy(...args);
    await ido.deployed();

    await finalizer.setIDO(ido.address).then(tx=>tx.wait());
    await deployed.treasury.pushManagement(finalizer.address).then(tx=>tx.wait());
    const ADDRESSES = {
        DAO_ADDRESS: "0x78a9e536EBdA08b5b9EDbE5785C9D1D50fA3278C",
        SCR_ADDRESS: deployed.scr.address,
        SSCR_ADDRESS: deployed.sscr.address,
        MIM_ADDRESS: dai.address,
        STAKING_ADDRESS: deployed.staking.address,
        STAKING_HELPER_ADDRESS: deployed.stakingHelper.address,
        SCR_BONDING_CALC_ADDRESS: deployed.olympusBondingCalculator.address,
        TREASURY_ADDRESS: deployed.treasury.address,
        ZAPIN_ADDRESS: "0xc669dC61aF974FdF50758d95306e4083D36f1430",
        MIM_BOND_ADDRESS: deployedBonds.daiBond.address,
        MIM_SCR_LP_ADDRESS: scrDaiLPAddress,
        MIM_SCR_LP_BOND_ADDRESS: deployedBonds.lpBond.address,
        IDO_ADDRESS: ido.address,
    };

    console.log("router ", router.address);
    console.log("factory ", factory.address);
    console.log("finalizer ", finalizer.address);
    console.log(ADDRESSES);

  await hre.run("verify:verify", {
    address: deployed.treasury.address,
    constructorArguments: [
      deployed.scr.address,
      dai.address,
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

