import { ethers } from "hardhat";

export const preludePoolID: string = "0xc4dac57a46a0a1acd0eb95eddef5257926279960000200000000000000000150";
export const fBeetsPoolID: string = "0xcde5a11a4acb4ee4c805352cec57e236bdbc3837000200000000000000000019";
export const ziggyPoolID: string = "0xd163415bd34ef06f57c58d2aed5a5478afb464cc00000000000000000000000e";
export const sigmasChefPID: string = "56";
export const preludeChefPID: string = "47";
export const ziggyStardustPID: string = "10";
export const fBeetsPID: string = "22";

export const addresses: Record<string, string> = {
    spiritSwapRouter: "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52",
    scrMIMSpiritLP: "0x468c174cc015d4a697586C0a99F95E045F7e6f91",
    beetsHelpers: "0xfE18C7C70b0a2c6541bEde0367124278BC345Dc8",
    beetsMasterChef: "0x8166994d9ebBe5829EC86Bd81258149B87faCfd3",
    beetsVault: "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce",
    steadyBeets2BPT: "0xeCAa1cBd28459d34B766F9195413Cb20122Fb942",
    ziggyStardustBPT: "0xD163415BD34EF06f57C58D2AEd5A5478AfB464cC",
    preludeBPT: "0xc4dAC57A46a0a1acd0eB95EDDeF5257926279960",
    fBeetsBPT: "0xcdE5a11a4ACB4eE4c805352Cec57E236bdBC3837",
    mim: "0x82f0B8B456c1A451378467398982d4834b6829c1",
    dai: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E",
    usdc: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
    beets: "0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e",
    fBeets: "0xfcef8a994209d6916EB2C86cDD2AFD60Aa6F54b1",
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
    ido: "0x39D08B1AeD049148704856b7cFC2d908689dFAa9",
    finalizer: "0x3F29543F1E1C03146a6475b9CF8D2D419E7edd89",
    beethovenVault: "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce",
    wftm: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
    wftmUsdcPriceFeed: "0xf4766552D15AE4d256Ad41B6cf2933482B0680dc",
}

export const contracts: Record<string, string> = {
    "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88": "",
    "0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157": "",
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

for (let [key] of Object.entries(addresses)) {
  addresses[key] = ethers.utils.getAddress(addresses[key])
}

for (let [key] of Object.entries(contracts)) {
  contracts[ethers.utils.getAddress(key)] = contracts[key];
}


