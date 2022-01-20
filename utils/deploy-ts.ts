import { ethers } from "hardhat";
import { providers, Signer, Contract, ContractFactory, Transaction } from "ethers";

export class LiquidTokenDeployer {
  deployer: Signer;

  constructor(deployer:Signer) {
    this.deployer = deployer;
  }

  async deploy() {
    const SCR = await ethers.getContractFactory('SecureERC20Token', this.deployer);
    const scr = await SCR.deploy();
    await scr.deployed();

    return scr;
  }
}

export class StakedTokenDeployer {
  deployer: Signer;

  constructor(deployer:Signer) {
    this.deployer = deployer;
  }

  async deploy() {
    const SSCR = await ethers.getContractFactory('sSCR', this.deployer);
    const sscr = await SSCR.deploy();
    await sscr.deployed();

    return sscr;
  }
}

export class TreasuryDeployer {
  deployer: Signer;
  reserve: string;
  liquid: string;

  constructor(deployer:Signer, reserve:string, liquid:string) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.reserve = reserve;
  }

  async deploy() {
    const Treasury = await ethers.getContractFactory('SecureTreasury', this.deployer);
    const treasury = await Treasury.deploy( this.liquid, this.reserve, 0 );
    await treasury.deployed();

    return treasury;
  }
}

export class StakingDeployer {
  deployer: Signer;
  staked: string;
  liquid: string;
  epochLengthInSeconds: number;
  firstEpochNumber: number;
  firstEpochTimeUnixSeconds: number;

  constructor(deployer:Signer, liquid:string, staked:string, epochLengthInSeconds:number, firstEpochNumber:number, firstEpochTimeUnixSeconds:number) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.staked = staked;
    this.epochLengthInSeconds = epochLengthInSeconds;
    this.firstEpochNumber = firstEpochNumber;
    this.firstEpochTimeUnixSeconds = firstEpochTimeUnixSeconds;
  }

  async deploy() {
    const Staking = await ethers.getContractFactory('SecureStaking', this.deployer);
    const staking = await Staking.deploy(
      this.liquid,
      this.staked,
      this.epochLengthInSeconds,
      this.firstEpochNumber,
      this.firstEpochTimeUnixSeconds
    );
    await staking.deployed();

    return staking;
  }
}

export class StakingWarmpupDeployer {
  deployer: Signer;
  staking: string;
  liquid: string;

  constructor(deployer:Signer, staking:string, liquid:string) {
    this.deployer = deployer;
    this.staking = staking;
    this.liquid = liquid;
  }

  async deploy() {
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup', this.deployer);
    const stakingWarmup = await StakingWarmpup.deploy(this.staking, this.liquid);
    await stakingWarmup.deployed();

    return stakingWarmup;
  }
}

export class StakingHelperDeployer {
  deployer: Signer;
  staking: string;
  liquid: string;

  constructor(deployer:Signer, staking:string, liquid:string) {
    this.deployer = deployer;
    this.staking = staking;
    this.liquid = liquid;
  }

  async deploy() {
    const StakingHelper = await ethers.getContractFactory('StakingHelper', this.deployer);
    const stakingHelper = await StakingHelper.deploy(this.staking, this.liquid);
    await stakingHelper.deployed();

    return stakingHelper;
  }
}

export class DistributorDeployer {
  deployer: Signer;
  treasury: string;
  liquid: string;
  epochLengthInSeconds: number;
  firstEpochTimeUnixSeconds: number;

  constructor(deployer:Signer, treasury:string, liquid:string, epochLengthInSeconds:number, firstEpochTimeUnixSeconds:number) {
    this.deployer = deployer;
    this.treasury = treasury;
    this.liquid = liquid;
    this.epochLengthInSeconds = epochLengthInSeconds;
    this.firstEpochTimeUnixSeconds = firstEpochTimeUnixSeconds;
  }

  async deploy() {
    const Distributor = await ethers.getContractFactory('Distributor', this.deployer);
    const distributor = await Distributor.deploy(
      this.treasury,
      this.liquid,
      this.epochLengthInSeconds,
      this.firstEpochTimeUnixSeconds
    );
    await distributor.deployed();

    return distributor;
  }
}

export class UniswapV2OracleDeployer {
  deployer: Signer;
  factory: string;
  tokenA: string;
  tokenB: string;

  constructor(deployer:Signer, factory:string, tokenA:string, tokenB:string) {
    this.deployer = deployer;
    this.factory = factory;
    this.tokenA = tokenA;
    this.tokenB = tokenB;
  }

  async deploy() {
    const Oracle = await ethers.getContractFactory(
      'UniswapV2Oracle',
      this.deployer,
    );
    const oracle = await Oracle.deploy(
      this.factory,
      this.tokenA,
      this.tokenB
    );
    await oracle.deployed();

    return oracle;
  }
}

export class UniswapV2OracleBondingCalculatorDeployer {
  deployer: Signer;
  oracle: string;

  constructor(deployer:Signer, oracleAddress:string) {
    this.deployer = deployer;
    this.oracle = oracleAddress;
  }

  async deploy() {
    const Calc = await ethers.getContractFactory("UniswapV2OracleBondingCalculator", this.deployer);
    const calc = await Calc.deploy(this.oracle);
    await calc.deployed();

    return calc;
  }
}

export class ChainlinkBondingCalculatorDeployer {
  deployer: Signer;
  liquid: string;

  constructor(deployer:Signer, liquid:string) {
    this.deployer = deployer;
    this.liquid = liquid;
  }

  async deploy() {
    const Calc = await ethers.getContractFactory('ChainlinkBondingCalculator', this.deployer);
    const calc = await Calc.deploy();
    await calc.deployed();

    return calc;
  }
}

export class ReserveBondingCalculatorDeployer {
  deployer: Signer;
  liquid: string;

  constructor(deployer:Signer, liquid:string) {
    this.deployer = deployer;
    this.liquid = liquid;
  }

  async deploy() {
    const Calc = await ethers.getContractFactory('ReserveBondingCalculator', this.deployer);
    const calc = await Calc.deploy();
    await calc.deployed();

    return calc;
  }
}

export class BondingCalculatorDeployer {
  deployer: Signer;
  liquid: string;

  constructor(deployer:Signer, liquid:string) {
    this.deployer = deployer;
    this.liquid = liquid;
  }

  async deploy() {
    const OlympusBondingCalculator = await ethers.getContractFactory('SecureBondingCalculator', this.deployer);
    const olympusBondingCalculator = await OlympusBondingCalculator.deploy( this.liquid );
    await olympusBondingCalculator.deployed();

    return olympusBondingCalculator;
  }
}

export class BondDepositoryV2Deployer {
  deployer: Signer;
  liquid: string;
  treasury: string;
  principle: string;
  calculator: string;
  dao: string;

  constructor(deployer:Signer, liquid:string, treasury:string, principle:string, calculator:string, dao:string) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.treasury = treasury;
    this.principle = principle;
    this.calculator = calculator;
    this.dao = dao;
  }

  async deploy() {
    const bonding = await ethers.getContractFactory(
      'SecureBondDepositoryV2',
      this.deployer
    );
    // Deploy DAI bond
    const bond = await bonding.deploy(
      this.liquid,
      this.principle,
      this.treasury,
      this.dao,
      this.calculator
    );
    await bond.deployed();

    return bond;
  }
}

export class BondDepositoryDeployer {
  deployer: Signer;
  liquid: string;
  treasury: string;
  principle: string;
  calculator: string;
  dao: string;

  constructor(deployer:Signer, liquid:string, treasury:string, principle:string, calculator:string, dao:string) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.treasury = treasury;
    this.principle = principle;
    this.calculator = calculator;
    this.dao = dao;
  }

  async deploy() {
    const bonding = await ethers.getContractFactory(
      'contracts/BondDepository.sol:SecureBondDepository',
      this.deployer
    );
    // Deploy DAI bond
    const bond = await bonding.deploy(
      this.liquid,
      this.principle,
      this.treasury,
      this.dao,
      this.calculator
    );
    await bond.deployed();

    return bond;
  }
}

export async function deployContracts(config:Record<string,any>, dai:Contract) {
    const deployer = config.deployer

    // First scr epoch occurs
    const firstEpochTimeUnixSeconds = config.firstEpochTimeUnixSeconds;

    // What epoch will be first epoch
    const firstEpochNumber = config.firstEpochNumber;

    // How many seconds are in each epoch
    const epochLengthInSeconds = config.epochLengthInSeconds;

    // Deploy SCR
    const scr:Contract = await new LiquidTokenDeployer(deployer).deploy();

    // Deploy SSCR
    const sscr:Contract = await new StakedTokenDeployer(deployer).deploy();

    // Deploy Staking
    const staking:Contract = await new StakingDeployer(
      deployer,
      scr.address,
      sscr.address,
      epochLengthInSeconds,
      firstEpochNumber,
      firstEpochTimeUnixSeconds
    ).deploy();

    // Deploy staking warmpup
    const stakingWarmup:Contract = await new StakingWarmpupDeployer(deployer, staking.address, sscr.address).deploy();

    // Deploy staking helper
    const stakingHelper:Contract = await new StakingHelperDeployer(deployer, staking.address, scr.address).deploy();

    // Deploy treasury
    const treasury:Contract = await new TreasuryDeployer(deployer, dai.address, scr.address).deploy();

    const TreasuryWrapper = await ethers.getContractFactory('TreasuryWrapper', deployer);
    const treasuryWrapper:Contract = await TreasuryWrapper.deploy(treasury.address);
    await treasuryWrapper.deployed();

    // Deploy staking distributor
    const distributor:Contract = await new DistributorDeployer(
      deployer,
      treasury.address,
      scr.address,
      epochLengthInSeconds,
      firstEpochTimeUnixSeconds
    ).deploy();

     // Deploy bonding calc
    const chainlinkCalc:Contract = await new ChainlinkBondingCalculatorDeployer(deployer, scr.address).deploy();
    const reserveCalc:Contract = await new ReserveBondingCalculatorDeployer(deployer, scr.address).deploy();

    return {
      reserveCalc,
      chainlinkCalc,
      scr: scr,
      sscr: sscr,
      staking: staking,
      stakingWarmup: stakingWarmup,
      stakingHelper: stakingHelper,
      treasury: treasury,
      distributor: distributor,
      treasuryWrapper: treasuryWrapper,
    };
}

export async function bootstrap(dai:Contract, config:Record<string,any>, deployed:Record<string,any>) {
    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    // Initial Bond debt
    const initialIndex = config.initialIndex;
    // Initial reward rate for epoch
    const initialRewardRate = config.initialRewardRate;

    let scr = deployed.scr;
    let sscr = deployed.sscr;
    let staking = deployed.staking;
    let distributor = deployed.distributor;
    let treasury = deployed.treasury;
    let stakingWarmup = deployed.stakingWarmup;

    await scr.setVault(treasury.address).then((tx:providers.TransactionResponse)=>tx.wait())
    // Initialize SSCR and set the index
    await sscr.connect(config.deployer).initialize(staking.address).then((tx:providers.TransactionResponse) => tx.wait());
    await sscr.setIndex(initialIndex).then((tx:providers.TransactionResponse) => tx.wait());

    // set distributor contract and warmup contract
    await staking.setContract('0', distributor.address).then((tx:providers.TransactionResponse) => tx.wait());
    await staking.setContract('1', stakingWarmup.address).then((tx:providers.TransactionResponse) => tx.wait());

    // Add staking contract as distributor recipient
    await distributor.addRecipient(staking.address, initialRewardRate).then((tx:providers.TransactionResponse) => tx.wait());

    // queue and toggle reward manager
    await treasury.queue('8', distributor.address).then((tx:providers.TransactionResponse) => tx.wait());
    await treasury.toggle('8', distributor.address, zeroAddress).then((tx:providers.TransactionResponse) => tx.wait());

}
