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

class BondDepositoryDeployer {
  constructor(deployer, liquid, treasury, principleAddress, calculatorAddress) {
    this.deployer = deployer;
    this.liquid = liquid;
    this.treasury = treasury;
    this.principleAddress = principleAddress;
    this.calculatorAddress = calculatorAddress;
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
      this.deployer.address,
      this.calculatorAddress
    );
    await bond.deployed();

    return bond;
  }
}

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
    const olympusBondingCalculator = await new BondingCalculatorDeployer(deployer, scr).deploy();

    return {
      olympusBondingCalculator: olympusBondingCalculator,
      scr: scr,
      sscr: sscr,
      staking: staking,
      stakingWarmup: stakingWarmup,
      stakingHelper: stakingHelper,
      treasury: treasury,
      treasuryWrapper: treasuryWrapper,
      distributor: distributor,
    };
}

module.exports.deployBonds = deployBonds;
async function deployBonds(dai, scrDaiLPAddress, config, deployed) {
    let scr = deployed.scr;
    let deployer = config.deployer;
    let treasury = deployed.treasury;
    let olympusBondingCalculator = deployed.olympusBondingCalculator;

    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    const daiBond = await new BondDepositoryDeployer(deployer, scr, treasury, dai.address, zeroAddress).deploy();

    // Deploy LP bond
    const lpBond = await new BondDepositoryDeployer(
      deployer,
      scr,
      treasury,
      scrDaiLPAddress,
      olympusBondingCalculator.address
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
    // DAI bond BCV
    const daiBondBCV = config.daiBondBCV;
    const bondVestingLengthSeconds = config.bondVestingLengthSeconds;
    // Min bond price
    const minBondPrice = config.minBondPrice;
    // Max bond payout
    const maxBondPayout = config.maxBondPayout;
    // DAO fee for bond
    const bondFee = config.bondFee;
    // Max debt bond can take on
    const maxBondDebt = config.maxBondDebt;
    // Initial Bond debt
    const initialBondDebt = config.initialBondDebt;
    const initialIndex = config.initialIndex;
    // Initial reward rate for epoch
    const initialRewardRate = config.initialRewardRate;

    let deployer = config.deployer;
    let olympusBondingCalculator = deployed.olympusBondingCalculator;
    let scr = deployed.scr;
    let sscr = deployed.sscr;
    let staking = deployed.staking;
    let stakingHelper = deployed.stakingHelper;
    let distributor = deployed.distributor;
    let treasury = deployed.treasury;
    let stakingWarmup = deployed.stakingWarmup;

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
async function bootstrapBonds(dai, scrDaiLPAddress, config, deployed, deployedBonds) {
    // Ethereum 0 address, used when toggling changes in treasury
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    // DAI bond BCV
    const daiBondBCV = config.daiBondBCV;
    const bondVestingLengthSeconds = config.bondVestingLengthSeconds;
    // Min bond price
    const minBondPrice = config.minBondPrice;
    // Max bond payout
    const maxBondPayout = config.maxBondPayout;
    // DAO fee for bond
    const bondFee = config.bondFee;
    // Max debt bond can take on
    const maxBondDebt = config.maxBondDebt;
    // Initial Bond debt
    const initialBondDebt = config.initialBondDebt;
    const initialIndex = config.initialIndex;
    // Initial reward rate for epoch
    const initialRewardRate = config.initialRewardRate;

    let deployer = config.deployer;
    let olympusBondingCalculator = deployed.olympusBondingCalculator;
    let lpBond = deployedBonds.lpBond;
    let daiBond = deployedBonds.daiBond;
    let scr = deployed.scr;
    let sscr = deployed.sscr;
    let staking = deployed.staking;
    let stakingHelper = deployed.stakingHelper;
    let distributor = deployed.distributor;
    let treasury = deployed.treasury;
    let stakingWarmup = deployed.stakingWarmup;
    // Set DAI bond terms
    await daiBond.initializeBondTerms(daiBondBCV, minBondPrice, maxBondPayout, bondFee, maxBondDebt, initialBondDebt, bondVestingLengthSeconds).then(tx => tx.wait());

    // Set staking for DAI bond
    await daiBond.setStaking(staking.address, stakingHelper.address).then(tx => tx.wait());

    // Set LP bond terms
    await lpBond.initializeBondTerms(daiBondBCV, minBondPrice, maxBondPayout, bondFee, maxBondDebt, initialBondDebt, bondVestingLengthSeconds).then(tx => tx.wait());

    // Set staking for DAI bond
    await lpBond.setStaking(staking.address, stakingHelper.address).then(tx => tx.wait());

    // queue and toggle DAI bond reserve depositor
    await treasury.queue('0', daiBond.address).then(tx => tx.wait());
    await treasury.toggle('0', daiBond.address, zeroAddress).then(tx => tx.wait());
    await treasury.queue('4', lpBond.address).then(tx => tx.wait());
    await treasury.toggle('4', lpBond.address, olympusBondingCalculator.address).then(tx => tx.wait());
}

