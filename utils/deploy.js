class LiquidTokenDeployer {
  constructor(deployer) {
    this.deployer = deployer;
  }

  async deploy() {
    const SCR = await ethers.getContractFactory('SecureERC20Token', this.deployer);
    const scr = await SCR.deploy();
    await scr.deployed();

    return scr;
  }
}

class StakedTokenDeployer {
  constructor(deployer) {
    this.deployer = deployer;
  }

  async deploy() {
    const SSCR = await ethers.getContractFactory('sSCR', this.deployer);
    const sscr = await SSCR.deploy();
    await sscr.deployed();

    return sscr;
  }
}

class TreasuryDeployer {
  constructor(deployer, reserve, liquid) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.reserve = reserve;
  }

  async deploy() {
    const Treasury = await ethers.getContractFactory('SecureTreasury', this.deployer);
    const treasury = await Treasury.deploy( this.liquid.address, this.reserve.address, 0 );
    await treasury.deployed();

    return treasury;
  }
}

class StakingDeployer {
  constructor(deployer, liquid, staked, epochLengthInSeconds, firstEpochNumber, firstEpochTimeUnixSeconds) {
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
      this.liquid.address,
      this.staked.address,
      this.epochLengthInSeconds,
      this.firstEpochNumber,
      this.firstEpochTimeUnixSeconds
    );
    await staking.deployed();

    return staking;
  }
}

class StakingWarmpupDeployer {
  constructor(deployer, staking, liquid) {
    this.deployer = deployer;
    this.staking = staking;
    this.liquid = liquid;
  }

  async deploy() {
    const StakingWarmpup = await ethers.getContractFactory('StakingWarmup', this.deployer);
    const stakingWarmup = await StakingWarmpup.deploy(this.staking.address, this.liquid.address);
    await stakingWarmup.deployed();

    return stakingWarmup;
  }
}

class StakingHelperDeployer {
  constructor(deployer, staking, liquid) {
    this.deployer = deployer;
    this.staking = staking;
    this.liquid = liquid;
  }

  async deploy() {
    const StakingHelper = await ethers.getContractFactory('StakingHelper', this.deployer);
    const stakingHelper = await StakingHelper.deploy(this.staking.address, this.liquid.address);
    await stakingHelper.deployed();

    return stakingHelper;
  }
}

class DistributorDeployer {
  constructor(deployer, treasury, liquid, epochLengthInSeconds, firstEpochTimeUnixSeconds) {
    this.deployer = deployer;
    this.treasury = treasury;
    this.liquid = liquid;
    this.epochLengthInSeconds = epochLengthInSeconds;
    this.firstEpochTimeUnixSeconds = firstEpochTimeUnixSeconds;
  }

  async deploy() {
    const Distributor = await ethers.getContractFactory('Distributor', this.deployer);
    const distributor = await Distributor.deploy(
      this.treasury.address,
      this.liquid.address,
      this.epochLengthInSeconds,
      this.firstEpochTimeUnixSeconds
    );
    await distributor.deployed();

    return distributor;
  }
}

class UniswapV2OracleDeployer {
  constructor(deployerAddress, factoryAddress, tokenAAddress, tokenBAddress) {
    this.deployer = deployerAddress;
    this.factory = factoryAddress;
    this.tokenA = tokenAAddress;
    this.tokenB = tokenBAddress;
  }

  async deploy() {
    const Oracle = await ethers.getContractFactory(
      'UniswapV2Oracle',
      this.deployer,
      this.factory,
      this.tokenA,
      this.tokenB
    );
    const oracle = await Oracle.deploy();
    await oracle.deployed();

    return oracle;
  }
}
module.exports.UniswapV2OracleDeployer = UniswapV2OracleDeployer;

class UniswapV2OracleBondingCalculatorDeployer {
  constructor(deployerAddress, oracleAddress) {
    this.deployer = deployerAddress;
    this.oracle = oracleAddress;
  }

  async deploy() {
    const Calc = await ethers.getContractFactory('UniswapV2OracleBondingCalculator', this.deployer, this.oracle);
    const calc = await Calc.deploy();
    await calc.deployed();

    return calc;
  }
}
module.exports.UniswapV2OracleBondingCalculatorDeployer = UniswapV2OracleBondingCalculatorDeployer;

class ChainlinkBondingCalculatorDeployer {
  constructor(deployer, liquid) {
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
module.exports.ChainlinkBondingCalculatorDeployer = ChainlinkBondingCalculatorDeployer;

class ReserveBondingCalculatorDeployer {
  constructor(deployer, liquid) {
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

class BondingCalculatorDeployer {
  constructor(deployer, liquid) {
    this.deployer = deployer;
    this.liquid = liquid;
  }

  async deploy() {
    const OlympusBondingCalculator = await ethers.getContractFactory('SecureBondingCalculator', this.deployer);
    const olympusBondingCalculator = await OlympusBondingCalculator.deploy( this.liquid.address );
    await olympusBondingCalculator.deployed();

    return olympusBondingCalculator;
  }
}

class BondDepositoryV2Deployer {
  constructor(deployer, liquid, treasury, principleAddress, calculatorAddress, dao) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.treasury = treasury;
    this.principleAddress = principleAddress;
    this.calculatorAddress = calculatorAddress;
    this.daoAddress = dao;
  }

  async deploy() {
    const bonding = await ethers.getContractFactory(
      'SecureBondDepositoryV2',
      this.deployer
    );
    // Deploy DAI bond
    const bond = await bonding.deploy(
      this.liquid.address,
      this.principleAddress,
      this.treasury.address,
      this.daoAddress,
      this.calculatorAddress
    );
    await bond.deployed();

    return bond;
  }
}
module.exports.BondDepositoryV2Deployer = BondDepositoryV2Deployer;

class BondDepositoryDeployer {
  constructor(deployer, liquid, treasury, principleAddress, calculatorAddress, dao) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.treasury = treasury;
    this.principleAddress = principleAddress;
    this.calculatorAddress = calculatorAddress;
    this.daoAddress = dao;
  }

  async deploy() {
    const bonding = await ethers.getContractFactory(
      'contracts/BondDepository.sol:SecureBondDepository',
      this.deployer
    );
    // Deploy DAI bond
    const bond = await bonding.deploy(
      this.liquid.address,
      this.principleAddress,
      this.treasury.address,
      this.daoAddress,
      this.calculatorAddress
    );
    await bond.deployed();

    return bond;
  }
}
module.exports.BondDepositoryDeployer = BondDepositoryDeployer;

module.exports.deployContracts = deployContracts;
async function deployContracts(config, dai) {
    const deployer = config.deployer

    // First scr epoch occurs
    const firstEpochTimeUnixSeconds = config.firstEpochTimeUnixSeconds;

    // What epoch will be first epoch
    const firstEpochNumber = config.firstEpochNumber;

    // How many seconds are in each epoch
    const epochLengthInSeconds = config.epochLengthInSeconds;

    // Deploy SCR
    const scr = await new LiquidTokenDeployer(deployer).deploy();

    // Deploy SSCR
    const sscr = await new StakedTokenDeployer(deployer).deploy();

    // Deploy Staking
    const staking = await new StakingDeployer(
      deployer,
      scr,
      sscr,
      epochLengthInSeconds,
      firstEpochNumber,
      firstEpochTimeUnixSeconds
    ).deploy();

    // Deploy staking warmpup
    const stakingWarmup = await new StakingWarmpupDeployer(deployer, staking, sscr).deploy();

    // Deploy staking helper
    const stakingHelper = await new StakingHelperDeployer(deployer, staking, scr).deploy();

    // Deploy treasury
    const treasury = await new TreasuryDeployer(deployer, dai, scr).deploy();

    const TreasuryWrapper = await ethers.getContractFactory('TreasuryWrapper', deployer);
    const treasuryWrapper = await TreasuryWrapper.deploy(treasury.address);
    await treasuryWrapper.deployed();

    // Deploy staking distributor
    const distributor = await new DistributorDeployer(
      deployer,
      treasury,
      scr,
      epochLengthInSeconds,
      firstEpochTimeUnixSeconds
    ).deploy();

     // Deploy bonding calc
    const chainlinkCalc = await new ChainlinkBondingCalculatorDeployer(deployer, scr).deploy();
    const reserveCalc = await new ReserveBondingCalculatorDeployer(deployer, scr).deploy();

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
      distributor: distributor,
    };
}

module.exports.deployBonds = deployBonds;
async function deployBonds(dai, scrDaiLPAddress, config, deployed) {
    let scr = deployed.scr;
    let dao = config.dao;
    let deployer = config.deployer;
    let treasury = deployed.treasury;
    let reserveBondingCalculator = deployed.reserveCalc;
    let chainlinkBondingCalculator = deployed.chainlinkCalc;

    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    const daiBond = await new BondDepositoryDeployer(deployer, scr, treasury, dai.address, zeroAddress, dao).deploy();

    // Deploy LP bond
    const lpBond = await new BondDepositoryV2Deployer(
      deployer,
      scr,
      treasury,
      scrDaiLPAddress,
      chainlinkBondingCalculator.address,
      dao
    ).deploy();

  return {
      daiBond: daiBond,
      lpBond: lpBond,
  }
}

module.exports.bootstrap = bootstrap;
async function bootstrap(dai, config, deployed) {
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

    await scr.setVault(treasury.address).then(tx=>tx.wait())
    // Initialize SSCR and set the index
    await sscr.connect(config.deployer).initialize(staking.address).then(tx => tx.wait());
    await sscr.setIndex(initialIndex).then(tx => tx.wait());

    // set distributor contract and warmup contract
    await staking.setContract('0', distributor.address).then(tx => tx.wait());
    await staking.setContract('1', stakingWarmup.address).then(tx => tx.wait());

    // Add staking contract as distributor recipient
    await distributor.addRecipient(staking.address, initialRewardRate).then(tx => tx.wait());

    // queue and toggle reward manager
    await treasury.queue('8', distributor.address).then(tx => tx.wait());
    await treasury.toggle('8', distributor.address, zeroAddress).then(tx => tx.wait());

}

module.exports.bootstrapBonds = bootstrapBonds;
async function bootstrapBonds(dai, priceFeed, scrDaiLPAddress, config, deployed, deployedBonds) {
    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    // DAI bond BCV
    const daiBondBCV = config.daiBondBCV;
    const lpBondBCV = config.lpBondBCV;
    const bondVestingLengthSeconds = config.bondVestingLengthSeconds;
    // Min bond price
    const minBondPriceLP = config.minBondPriceLP;
    const minBondPriceReserve = config.minBondPriceReserve;
    // Max bond payout
    const maxBondPayout = config.maxBondPayout;
    // DAO fee for bond
    const bondFee = config.bondFee;
    // Max debt bond can take on
    const maxBondDebtReserve = config.maxBondDebtReserve;
    const maxBondDebtLP = config.maxBondDebtLP;
    // Initial Bond debt
    const initialBondDebt = config.initialBondDebt;

    let reserveBondingCalculator = deployed.reserveCalc;
    let chainlinkBondingCalculator = deployed.chainlinkCalc;
    let lpBond = deployedBonds.lpBond;
    let daiBond = deployedBonds.daiBond;
    let staking = deployed.staking;
    let stakingHelper = deployed.stakingHelper;
    let treasury = deployed.treasury;

    // Set DAI bond terms
    await daiBond.initializeBondTerms(
      daiBondBCV, minBondPriceReserve,
      maxBondPayout, bondFee, maxBondDebtReserve,
      initialBondDebt, bondVestingLengthSeconds
    ).then(tx => tx.wait());

    // Set staking for DAI bond
    await daiBond.setStaking(staking.address, false).then(tx => tx.wait());

    // Set LP bond terms
    await lpBond.initializeBondTerms(
      lpBondBCV, minBondPriceLP, maxBondPayout,
      bondFee, maxBondDebtLP, initialBondDebt,
      bondVestingLengthSeconds
    ).then(tx => tx.wait());

    // Set staking for DAI bond
    await lpBond.setStaking(staking.address).then(tx => tx.wait());

    // queue and toggle DAI bond reserve depositor
    await treasury.queue('0', daiBond.address).then(tx => tx.wait());
    await treasury.toggle('0', daiBond.address, zeroAddress).then(tx => tx.wait());
    await treasury.queue('4', lpBond.address).then(tx => tx.wait());
    await treasury.toggle('4', lpBond.address, chainlinkBondingCalculator.address).then(tx => tx.wait());

    await chainlinkBondingCalculator.updatePriceFeed(scrDaiLPAddress, priceFeed);
}

