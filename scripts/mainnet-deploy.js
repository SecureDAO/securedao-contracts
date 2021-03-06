const { ethers } = require("hardhat");
const fs = require('fs')
const erc20ABI = fs.readFileSync('./abi/ERC20.json', 'utf8')
const factoryABI = fs.readFileSync('./abi/UniswapV2Factory.json', 'utf8')
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("deploying with address ", deployer.address);

    const eth = ethers.BigNumber.from(10).pow(18);
    const gwei = ethers.BigNumber.from(10).pow(9);
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    const factoryAddress = '0xEF45d134b73241eDa7703fa787148D9C9F4950b0'; // SpiritSwap
    const daoAddress = '0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88';
    const team = '0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157';
    const MIMAddress = '0x82f0b8b456c1a451378467398982d4834b6829c1';
    const timelockMinimum = 3600*12;

    const firstEpochDelay = 8*3600;
    const startOfSale = 1639717200;

    // Bond vesting length in seconds (5 days)
    const bondVestingLengthSeconds = 3600 * 24 * 5;
    // How many seconds are in each epoch
    const epochLengthInSeconds = 3600 * 8; // 8 hours
    // Time of first epoch
    const firstEpochTimeUnixSeconds = startOfSale + (3600*24*2) + firstEpochDelay;

    // What epoch will be first epoch
    const firstEpochNumber = 1;
    // Initial reward rate for epoch
    const initialRewardRate = 30000; // 3%
    // MIM bond BCV
    const daiBondBCV = 873;
    // MIM-SCR bond BCV
    const lpBondBCV = 370;
    // Min bond price
    const minBondPriceReserve = 10200;
    const minBondPriceLP = 820; // TODO
    // Max bond payout
    const maxBondPayout = 410; // 0.41%
    // DAO fee for bond
    const bondFee = 1000; // 10%
    // Max debt bond can take on
    const maxBondDebtLP = gwei.mul(80000);
    const maxBondDebtReserve = gwei.mul(30000);
    // Initial Bond debt
    const initialBondDebt = 0;
    const initialIndex = gwei;

    const totalNativeForSale = gwei.mul(2500);
    const salePrice = eth.mul(100);
    const publicSaleAlloc = gwei.mul(5);

    const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
    const reserve = new ethers.Contract(MIMAddress, erc20ABI, deployer);

    const config = {
      dao: daoAddress,
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
      lpBondBCV: lpBondBCV,
      minBondPriceLP: minBondPriceLP,
      minBondPriceReserve: minBondPriceReserve,
      maxBondDebtReserve: maxBondDebtReserve,
      maxBondDebtLP: maxBondDebtLP,
      deployer: deployer,
    }

    console.log(config);
    // Deploy contracts
    let deployed = await deployContracts(config, reserve);

    // Finish contract set up
    await deployed.scr.setVault(deployed.treasury.address).then(tx => tx.wait());

    console.log("contracts deployed");
    await bootstrap(reserve, config, deployed);

    await factory.createPair(deployed.scr.address, reserve.address).then(tx => tx.wait());
    const scrReserveLPAddress = await factory.getPair(deployed.scr.address, reserve.address);

    const deployedBonds = await deployBonds(reserve, scrReserveLPAddress, config, deployed);

    await bootstrapBonds(reserve, scrReserveLPAddress, config, deployed, deployedBonds);

    //console.log("contracts boostrapped");
    //const Finalizer = await ethers.getContractFactory('Finalizer', deployer);
    //finalizer = await Finalizer.deploy(
    //  deployed.treasury.address,
    //  deployed.staking.address,
    //  team,
    //  factory.address,
    //  deployed.olympusBondingCalculator.address
    //);
    //await finalizer.deployed()

    //const IDO = await ethers.getContractFactory('IDO');
    //const args = [
    //  reserve.address,
    //  deployed.staking.address,
    //  finalizer.address,
    //  totalNativeForSale,
    //  salePrice,
    //  startOfSale,
    //  publicSaleAlloc,
    //]
    //const ido = await IDO.deploy(...args);
    //await ido.deployed();

    //await finalizer.setIDO(ido.address).then(tx=>tx.wait());

    //const Timelock = await ethers.getContractFactory("Timelock");
    //const timelock = await Timelock.deploy(timelockMinimum, [daoAddress], [daoAddress])
    //await timelock.deployed();

    //// Transfer ownership for everything except for the IDO (need to add whitelist)
    //console.log("transferring ownership");
    //await deployed.treasury.pushManagement(finalizer.address).then(tx=>tx.wait());
    //await finalizer.transferOwnership(timelock.address).then(tx=>tx.wait());
    //await deployed.staking.pushManagement(timelock.address).then(tx=>tx.wait());
    //await deployed.distributor.pushPolicy(timelock.address).then(tx=>tx.wait());
    //await deployed.sscr.pushManagement(timelock.address).then(tx=>tx.wait());
    //await deployedBonds.lpBond.pushManagement(timelock.address).then(tx=>tx.wait());
    //await deployedBonds.daiBond.pushManagement(timelock.address).then(tx=>tx.wait());

    //const ADDRESSES = {
    //    DAO_ADDRESS: daoAddress,
    //    SCR_ADDRESS: deployed.scr.address,
    //    SSCR_ADDRESS: deployed.sscr.address,
    //    MIM_ADDRESS: reserve.address,
    //    STAKING_ADDRESS: deployed.staking.address,
    //    STAKING_HELPER_ADDRESS: deployed.stakingHelper.address,
    //    SCR_BONDING_CALC_ADDRESS: deployed.olympusBondingCalculator.address,
    //    TREASURY_ADDRESS: deployed.treasury.address,
    //    ZAPIN_ADDRESS: "0xc669dC61aF974FdF50758d95306e4083D36f1430",
    //    MIM_BOND_ADDRESS: deployedBonds.daiBond.address,
    //    MIM_SCR_LP_ADDRESS: scrReserveLPAddress,
    //    MIM_SCR_LP_BOND_ADDRESS: deployedBonds.lpBond.address,
    //    IDO_ADDRESS: ido.address,
    //};

    //console.log("factory ", factory.address);
    //console.log("finalizer ", finalizer.address);
    //console.log(ADDRESSES);

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.scr.address,
    //  constructorArguments: [],
    //});
    //} catch (error) {
    //  console.log("couldn't verify SCR", error);
    //}

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.sscr.address,
    //  constructorArguments: [],
    //});
    //} catch (error) {
    //  console.log("couldn't verify sSCR", error);
    //}

    //try{
    //await hre.run("verify:verify", {
    //  address: deployed.treasury.address,
    //  constructorArguments: [
    //    deployed.scr.address,
    //    MIMAddress,
    //    0,
    //  ],
    //});
    //} catch (error) {
    //  console.log("couldn't verify treasury", error);
    //}

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.staking.address,
    //  constructorArguments: [
    //    deployed.scr.address,
    //    deployed.sscr.address,
    //    epochLengthInSeconds,
    //    firstEpochNumber,
    //    firstEpochTimeUnixSeconds,
    //  ],
    //});
    //} catch {
    //  console.log("couldn't verify staking", error);
    //}

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.stakingWarmup.address,
    //  constructorArguments: [
    //    deployed.staking.address,
    //    deployed.scr.address,
    //  ],
    //});
    //} catch (error) {
    //  console.log("couldn't verify stakingWarmup", error);
    //}

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.stakingHelper.address,
    //  constructorArguments: [
    //    deployed.staking.address,
    //    deployed.scr.address,
    //  ],
    //});
    //} catch (error) {
    //  console.log("couldn't verify stakingHelper ", error);
    //}

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.distributor.address,
    //  constructorArguments: [
    //    deployed.treasury.address,
    //    deployed.scr.address,
    //    epochLengthInSeconds,
    //    firstEpochTimeUnixSeconds,
    //  ],
    //});
    //} catch (error) {
    //  console.log("couldn't verify distributor ", error);
    //}

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.olympusBondingCalculator.address,
    //  constructorArguments: [
    //    deployed.scr.address,
    //  ],
    //});
    //} catch (error) {
    //  console.log("couldn't verify bonding calculator ", error);
    //}

    //try {
    //await hre.run("verify:verify", {
    //  address: deployed.lpBond.address,
    //  constructorArguments: [
    //    deployed.scr.address,
    //    scrReserveLPAddress,
    //    deployed.treasury.address,
    //    daoAddress,
    //    deployed.olympusBondingCalculator.address,
    //  ],
    //});
    //} catch (error) {
    //  console.log("couldn't verify lp bond ", error);
    //}

    //try {
    //  await hre.run("verify:verify", {
    //    address: deployed.daiBond.address,
    //    constructorArguments: [
    //      deployed.scr.address,
    //      MIMAddress,
    //      deployed.treasury.address,
    //      daoAddress,
    //      zeroAddress,
    //    ],
    //  });
    //} catch (error) {
    //  console.log("couldn't verify mim bond ", error);
    //}
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


