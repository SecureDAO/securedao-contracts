const { ethers } = require("hardhat");

const addresses = {
    multisig: "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88",
    team: "0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157",
    timelock: "0xac4220abfd028f9c12b7916235180bbe73619b00",
    timelockChecksum: "0xAc4220AbFd028f9c12b7916235180BBE73619B00",
    scr: "0x8183C18887aC4386CE09Dbdf5dF7c398DAcB2B5a",
    staked_scr: "0x27Eef8DC26A6747C54cB74e18665B0734d533a17",
    treasury: "0xa39b5f217EdBDe068b4D3fA98256244ef74774a1",
    distributor: "0xf9571592e60eD842470e3574D44665445156C77f",
    staking: "0x3d97040e407078823891C59BB07eadb2dDF3AE32",
    stakingHelper: "0xD6D001e3B84618cEEf7Ce85ea51c03B66c2caEB7",
    stakingWarmup: "0x544c670255D53D34163B87c10043bfa4e4d84F34",
    mimBond: "0x3972dc5D892aE4026416134bc251152067DB0665",
    daiBond: "0xFA469AdBf909b252DaC1E8c0dDffF3Dc49547D38",
    mimScrBond: "0x1fAdE3E269d8D3734f6AC6dC7f86dCFc3f1F73A5",
    ido: "0xd641887848eB23b81B9DcAA3956448a6c717e842",
    finalizer: "0x3F29543F1E1C03146a6475b9CF8D2D419E7edd89",
}
module.exports.addresses = addresses;

const contracts = {
    "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88": null,
    "0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157": null,
    "0xac4220abfd028f9c12b7916235180bbe73619b00": "Timelock",
    "0xAc4220AbFd028f9c12b7916235180BBE73619B00": "Timelock",
    "0x8183C18887aC4386CE09Dbdf5dF7c398DAcB2B5a": "SecureERC20Token",
    "0x27Eef8DC26A6747C54cB74e18665B0734d533a17": "sSCR",
    "0xa39b5f217EdBDe068b4D3fA98256244ef74774a1": "SecureTreasury",
    "0xf9571592e60eD842470e3574D44665445156C77f": "Distributor",
    "0x3d97040e407078823891C59BB07eadb2dDF3AE32": "SecureStaking",
    "0xD6D001e3B84618cEEf7Ce85ea51c03B66c2caEB7": "StakingHelper",
    "0x544c670255D53D34163B87c10043bfa4e4d84F34": "StakingWarmup",
    "0xFA469AdBf909b252DaC1E8c0dDffF3Dc49547D38": "contracts/BondDepository.sol:SecureBondDepository",
    "0x3972dc5D892aE4026416134bc251152067DB0665": "contracts/BondDepository.sol:SecureBondDepository",
    "0x1fAdE3E269d8D3734f6AC6dC7f86dCFc3f1F73A5": "contracts/BondDepository.sol:SecureBondDepository",
    "0xd641887848eB23b81B9DcAA3956448a6c717e842": "IDO", // OLD
    "0x3F29543F1E1C03146a6475b9CF8D2D419E7edd89": "Finalizer", // OLD
    "0x39D08B1AeD049148704856b7cFC2d908689dFAa9": "IDO",
    "0x1AAC063847e65B5B1F77Bb8f0A7cec085eFB28cd": "Finalizer",
}
module.exports.contracts = contracts;

for (let [key] of Object.entries(addresses)) {
  addresses[key] = ethers.utils.getAddress(addresses[key])
}
for (let [key] of Object.entries(contracts)) {
  contracts[ethers.utils.getAddress(key)] = contracts[key];
}

