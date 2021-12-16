const { ethers } = require("hardhat");
const BigNumber = ethers.BigNumber;
const fs = require('fs')
const gnosisSafeABI = fs.readFileSync('./abi/GnosisSafe.json', 'utf8')

const addresses = {
    multisig: "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88",
    team: "0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157",
    timelock: "0xac4220abfd028f9c12b7916235180bbe73619b00",
    scr: "0x8183C18887aC4386CE09Dbdf5dF7c398DAcB2B5a",
    staked_scr: "0x27Eef8DC26A6747C54cB74e18665B0734d533a17",
    treasury: "0xa39b5f217EdBDe068b4D3fA98256244ef74774a1",
    staking: "0xf9571592e60eD842470e3574D44665445156C77f",
    stakingHelper: "0xD6D001e3B84618cEEf7Ce85ea51c03B66c2caEB7",
    stakingWarmup: "0x544c670255D53D34163B87c10043bfa4e4d84F34",
    mimBond: "0x3972dc5D892aE4026416134bc251152067DB0665",
    mimScrBond: "0x1fAdE3E269d8D3734f6AC6dC7f86dCFc3f1F73A5",
    ido: "0xd641887848eB23b81B9DcAA3956448a6c717e842",
    finalizer: "0x3F29543F1E1C03146a6475b9CF8D2D419E7edd89",
}

const contracts = {
    "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88": null,
    "0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157": null,
    "0xac4220abfd028f9c12b7916235180bbe73619b00": "Timelock",
    "0x8183C18887aC4386CE09Dbdf5dF7c398DAcB2B5a": "SecureERC20Token",
    "0x27Eef8DC26A6747C54cB74e18665B0734d533a17": "StakedSecureERC20",
    "0xa39b5f217EdBDe068b4D3fA98256244ef74774a1": "SecureStaking",
    "0xf9571592e60eD842470e3574D44665445156C77f": "SecureStaking",
    "0xD6D001e3B84618cEEf7Ce85ea51c03B66c2caEB7": "StakingHelper",
    "0x544c670255D53D34163B87c10043bfa4e4d84F34": "StakingWarmup",
    "0x3972dc5D892aE4026416134bc251152067DB0665": "contracts/BondDepository.sol:SecureBondDepository",
    "0x1fAdE3E269d8D3734f6AC6dC7f86dCFc3f1F73A5": "contracts/BondDepository.sol:SecureBondDepository",
    "0xd641887848eB23b81B9DcAA3956448a6c717e842": "IDO",
    "0x3F29543F1E1C03146a6475b9CF8D2D419E7edd89": "Finalizer",
}

async function main() {
  const txHashes = ['0xb53ac3e507a5576f30ee5593671f2d7eb7eff1ebe438e265af61972f2c5440e8'];

  const multisigAddr = addresses.multisig;
  const timelockAddr = addresses.timelock;

  const ether = BigNumber.from('10').pow(18);
  const gwei = BigNumber.from('10').pow(9);
  const [deployer] = await ethers.getSigners();

  const gnosis = new ethers.Contract(multisigAddr, gnosisSafeABI, deployer);
  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = Timelock.attach(timelockAddr);

  const iface = gnosis.interface;

  for (let txHash of txHashes) {
    const tx = await ethers.provider.getTransaction(txHash);
    const txDesc = iface.parseTransaction(tx);
    console.log(txDesc.args);
    const timelockTxDesc = timelock.interface.parseTransaction({data: txDesc.args.data})
    console.log(timelockTxDesc);

    const Bond = await ethers.getContractFactory(contracts[timelockTxDesc.args.target])
    let bond = Bond.attach(timelockTxDesc.args.target)
    console.log(bond.interface.parseTransaction({data: timelockTxDesc.args.data}));
  }
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})




