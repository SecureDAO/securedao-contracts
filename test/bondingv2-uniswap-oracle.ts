import { ethers  } from "hardhat";
import { providers, Signer, Contract, ContractFactory, Transaction } from "ethers";
import * as fs from "fs";
import chai, { expect } from "chai";
import { bootstrap, deployContracts, BondDepositoryV2Deployer, UniswapV2OracleBondingCalculatorDeployer, UniswapV2OracleDeployer } from "../utils/deploy-ts";

chai.use(require('chai-as-promised'))
const eth = ethers.BigNumber.from(10).pow(18)
const gwei = ethers.BigNumber.from(10).pow(9)
const largeApproval = '100000000000000000000000000000000';
const zeroAddress = '0x0000000000000000000000000000000000000000';

describe("bonding-v2-uniswap-oracle-calculator", () => {
  const priceFeedDecimals = 8;
  const price = ethers.BigNumber.from(63245553203367);
  const firstEpochDelay = 1800;
  const saleDelay = (60*1);
  // Time of first epoch
  const firstEpochTimeUnixSeconds = Math.round(Date.now() / 1000) + firstEpochDelay;
  // What epoch will be first epoch
  const firstEpochNumber = '1';
  // How many blocks are in each epoch
  const epochLengthInSeconds = 3600 * 8; // 8 hours
  // Initial reward rate for epoch
  const initialRewardRate = 30000; // 3%
  // MIM bond BCV
  const daiBondBCV = 1;
  // MIM-SCR bond BCV
  const lpBondBCV = 1;
  // Bond vesting length in blocks. 33110 ~ 5 days
  const bondVestingLengthSeconds = 3600 * 24 * 5;
  // Min bond price
  const minBondPriceReserve = 100;
  const minBondPriceLP = 100; // TODO
  // Max bond payout
  const maxBondPayout = 410; // 0.41%
  // DAO fee for bond
  const bondFee = 0; // 10%
  // Max debt bond can take on
  const maxBondDebtLP = gwei.mul(8).mul(1e4);
  const maxBondDebtReserve = gwei.mul(3).mul(1e4);
  // Initial Bond debt
  const initialBondDebt = '0'
  const initialIndex = gwei;
  let deployer: Signer;
  let team: Signer;
  let deployed: Record<string, any>;
  let config: Record<string, any>;
  let dai: Contract;
  let router: Contract;
  let daoAddress: string;
  let DAI: ContractFactory;
  let feed: Contract;
  let deployedBonds: Record<string, any>;
  let pair: Contract;
  let reserve: Contract;
  let factory: Contract;
  let bond: Contract;
  let token: Contract;
  let deployerAddr: string;

  it("succeeds for lp bonds", async function() {
    [deployer, team] = await ethers.getSigners();
    deployerAddr = await deployer.getAddress();
    daoAddress = deployerAddr;
    // Deploy mock feed

    const Feed = await ethers.getContractFactory('PriceFeed');
    feed = await Feed.deploy(priceFeedDecimals, price)
    await feed.deployed();

    // Deploy DAI
    DAI = await ethers.getContractFactory('DAI');
    dai = await DAI.deploy( 0 );
    await dai.deployed();
    await dai.mint( deployerAddr, eth.mul(1e6) );

    const Factory = await ethers.getContractFactory('Factory');
    factory = await Factory.deploy(zeroAddress);
    await factory.deployed();

    const WETH = await ethers.getContractFactory('WETH', deployer);
    const weth = await WETH.deploy();
    const Router = await ethers.getContractFactory('Router', deployer);

    router = await Router.deploy(factory.address, weth.address);
    await router.deployed();

    reserve = dai;
    const config = {
      firstEpochTimeUnixSeconds: firstEpochTimeUnixSeconds,
      dao: deployerAddr,
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

    // Deploy contracts
    let deployed = await deployContracts(config, reserve);

    // Finish contract set up
    await deployed.scr.setVault(deployed.treasury.address).then((tx:providers.TransactionResponse) => tx.wait());
    await bootstrap(reserve, config, deployed);

    token = await DAI.deploy(0);

    await token.mint(deployerAddr, eth.mul(1e9));
    await reserve.mint(deployerAddr, eth.mul(1e9));
    await reserve.approve(deployed.treasury.address, largeApproval).then((tx:providers.TransactionResponse)=>tx.wait());

    await deployed.treasury.queue(0, deployerAddr);
    await deployed.treasury.toggle(0, deployerAddr, zeroAddress);

    await deployed.treasury.deposit(eth.mul(1000), reserve.address, 0);
    await deployed.treasury.deposit(eth.mul(1000), reserve.address, await deployed.treasuryWrapper.valueOfToken(dai.address, eth.mul(1000)));

    await token.approve(router.address, largeApproval).then((tx:providers.TransactionResponse)=>tx.wait());
    await reserve.approve(router.address, largeApproval).then((tx:providers.TransactionResponse)=>tx.wait());

    await router.addLiquidity(
      token.address,
      reserve.address,
      eth.mul(1000),
      eth.mul(1000*100),
      eth.mul(1000),
      eth.mul(1000*100),
      deployerAddr,
      eth.mul(1000),
    )

    let oracle = await new UniswapV2OracleDeployer(deployer, factory.address, token.address, reserve.address).deploy();
    let calc = await new UniswapV2OracleBondingCalculatorDeployer(deployer, oracle.address).deploy();
    bond = await new BondDepositoryV2Deployer(deployer, deployed.scr.address, deployed.treasury.address, token.address, calc.address, deployerAddr).deploy();


    let bondBCV = 100;
    let minBondPrice = 100;
    await bond.initializeBondTerms(
      bondBCV, minBondPriceLP, maxBondPayout,
      bondFee, maxBondDebtLP, initialBondDebt,
      bondVestingLengthSeconds
    ).then((tx:providers.TransactionResponse) => tx.wait());

    // Set staking for DAI bond
    await bond.setStaking(deployed.staking.address).then((tx:providers.TransactionResponse) => tx.wait());
    await deployed.treasury.queue('5', token.address).then((tx:providers.TransactionResponse) => tx.wait());
    await deployed.treasury.toggle('5', token.address, calc.address).then((tx:providers.TransactionResponse) => tx.wait());
    await deployed.treasury.queue('4', bond.address).then((tx:providers.TransactionResponse) => tx.wait());
    await deployed.treasury.toggle('4', bond.address, calc.address).then((tx:providers.TransactionResponse) => tx.wait());

    await ethers.provider.send("evm_increaseTime", [3700])
    await ethers.provider.send("evm_mine", [])
    await oracle.update().then((tx:providers.TransactionResponse) => tx.wait());


    expect(await deployed.treasury.isLiquidityToken(token.address)).to.eq(true)
    let val = await deployed.treasuryWrapper.valueOfToken(token.address, eth);
    expect(val).to.eq(gwei.mul(100));
    expect(await bond.bondPrice()).to.eq(200);
    expect(await bond.payoutFor(val)).to.eq(gwei.mul(50));
    expect(await bond.bondPriceInUSD()).to.eq(eth.mul(2));

    await token.approve(bond.address, largeApproval).then((tx:providers.TransactionResponse)=>tx.wait());
    expect(await deployed.treasuryWrapper.valueOfToken(token.address, eth.div(100))).to.eq(gwei);
    await bond.deposit(eth.div(100), eth.mul(1000), deployerAddr).then((tx:providers.TransactionResponse) => tx.wait())

    expect((await bond.bondInfo(deployerAddr)).payout).to.eq(gwei.div(2));
  })
})


