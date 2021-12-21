const { ethers } = require("hardhat");
const BigNumber = ethers.BigNumber;
const fs = require('fs')
const gnosisSafeABI = fs.readFileSync('./abi/GnosisSafe.json', 'utf8')

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
    mimScrBond: "0x1fAdE3E269d8D3734f6AC6dC7f86dCFc3f1F73A5",
    ido: "0xd641887848eB23b81B9DcAA3956448a6c717e842",
    finalizer: "0x3F29543F1E1C03146a6475b9CF8D2D419E7edd89",
}

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
    "0x3972dc5D892aE4026416134bc251152067DB0665": "contracts/BondDepository.sol:SecureBondDepository",
    "0x1fAdE3E269d8D3734f6AC6dC7f86dCFc3f1F73A5": "contracts/BondDepository.sol:SecureBondDepository",
    "0xd641887848eB23b81B9DcAA3956448a6c717e842": "IDO", // OLD
    "0x3F29543F1E1C03146a6475b9CF8D2D419E7edd89": "Finalizer", // OLD
    "0x39D08B1AeD049148704856b7cFC2d908689dFAa9": "IDO",
    "0x1AAC063847e65B5B1F77Bb8f0A7cec085eFB28cd": "Finalizer",
}

async function main() {
  const txHashes = [
//"0x9e67e55f9175d313098cb2de291ea62e66c2a19a174c71da87175078f26a23d5",
//"0xd894c8dedd33ed9064eab3643a85d14763e4559ea0c1e928355edf78bd5dac56",
//"0x21c1764ac9acd0dd40025e980e143e87c0aab0dabb20179e110af0d171bfea99",
//"0x79e34b8453a1d2d39b66869c733d291bb6995b5ddb62ed054a55cb54703018a3",
//"0xdf768ad76bac4bc2f37c284413e299993186a0ce4ec3d18a726e6c2415beabf2",
//"0xad15cabcdd9dcac6061eadcf9cc76ce6352e625470400947a3163945de9d7ff3",
//"0xefea850d8536094f7483e16b32c53cb608edbd58e20ddb94f5a38dea25229f83",
//"0x01bc807ec9efa9b87440c5575148a2e20f1435fc9b68b3bcb1ed492b0657164b",
//"0xb53ac3e507a5576f30ee5593671f2d7eb7eff1ebe438e265af61972f2c5440e8",
//"0xcbfc3293e4ae18200af8075a67830247d8b124515ec5949fc449004c742c5265",
//"0xe9a6257ab51d897b166cfe7d06386c974b2eec3e89d0289a2407b9ed6c0bb648",
//"0x11f6709c1b000b0d3e6e087443493cb53bc0fa717cef180c9d075796d3ce0e60",
//"0x8bd45b17b126ab672b0864265d42dab01b6be00c7e81519d3b3854425b965366",
//"0x767c280e47d8e77c1531bbff461d0250bca1fe2171fcd4c3c9fc76277842509a",
//"0x0415c7364066aff06dc6a59ed09ff3fa7f780a555e0414f5c498a69bfe2a09d3",
//"0x3a045bd41c7afe2b0f738de6bc56b87ec81739812369c79ac3707ca22ee7ca28",
//"0x459c001f38c347802f89b409967d031bd4fc42e70ca11457cd99eefdd57b8565",
//"0x97ca5cf75287a645bb6b58941b746a619c7315a340078b049963fce1846208f1",
//"0xbd90a943093bda4620e1800a7417f5e884ffffff445944e43a9192e9b0586401",
//"0x0bff2f98e9b0d330dc63387fbc62370fd51dbe95e344e0a926e6f64d3c3c18da",
//"0xe181813e8419954e0d27b9d230d720fc011da5e4bb30dafde103e94b0a2bcf32",
//"0x5502c26b80dcfa36a1b05d73d11d7c6554a3abb4a206966be165bdcc72b5f468",
//"0xdd512e2bfb73b355a348b7b1a6083ec5d5b7c98fd9ed9efed7581cc037fbef29",
//"0xc63ea8dbe95349a678d94caf9a7123e9b6b2209da68084b668947b9e311cad97",
//"0xe2025ea9712a1422262389667db45aded4149a1516f41fd37e626d1b70a0e5fe",
//"0x45d503bba205765e651b98b0cb94268876a69275ff4ff5629b35cc7d30f025ef",
//"0xf4228c67da7e1413df1e9d1d60773b8cb039818813fb968e793c85c5aaa6304c",
//"0xa57beb8accb98a3b15591e8f6927a2a263efe919872ea28bb7839e0e3b79acc0",
//"0x46d56b90fe40ef24b5bdc3dacc477f345563ac67d02694ba6081e9717eea70e0",
//"0xc7a93d89fac107139294f1d24b49b44f6ae7e0434cce1d19d0a45e3a60dbbf0a",
//"0xd2a4ebdad19e281b9354bd86553931213e4bdaeb4e7e2c8f823edf1fe567104d",
//"0xba6f97a2d2b4b2de77442f2a9a2a1e43fa10c1e56dabcf6312e2815b1de9e25e",
//"0xbe6328a16743cbc0018093365f430914b0f3c97eb9e189b1431db018cc05faaa",
//"0x852cecc8bcbb46aed8e1ef9de50d662389d6f13b99110be44f1d6de92428b54a",
//"0x70982a986803344b122af85aeeb32085687cac7eb975afde5e981351d9b8c905",
//"0xaef33aea6a26e03a5d2a3877888dbb58a554ef6d0f6ca6847552bb6b3b54f090",
//"0x3c83d73e524ac549e7eb8469f553414690c299c9ea702e43773061a14594acad",
//"0x310cd4850263d0e26dfa48be17007ea5d081b421a817ec5a0b268c8088e86bcf",
//"0xad541505b51c1bc3c84fbefbbe00de200104da561f365ecdfedb25353bfe4fb3",
  //"0x467073d98e5f1fd60957d5dd1194f21e77d4a44cc88420dc9772eba0ee2e96ef",
  //"0x1edfc28e53dacbbb3e1b8a1057ebcfda64ab3e586c5b4a1d851d6219683cca7d",
  //"0xce3d3a00cd36a90071bc5dba54204e476a0a7014d23ff5918348d255e7774dc1",

  //"0xf1342bd64f5c756f75bf44574aff67fceedc17c218e1a8bb324399da9629f779",
  "0x793d386006bde2a6569aeef9ab78b6379a2d7632dd428fdf2a94f7c8e5a9d9e1",
  "0x02849e038d14a73955d6f121c94211209d9a9235cfa9c963353b7f3b25d26dd3",
  //"0xa74661be4e3221d6f24c21f74e6c4c32fa301eede895beb93dfe1a6015cc9772",
  ];
  let provider = new ethers.providers.EtherscanProvider();
  let history = await provider.getHistory(addresses.multisig);
  console.log(history);
  for (let [key] of Object.entries(addresses)) {
    addresses[key] = ethers.utils.getAddress(addresses[key])
  }
  for (let [key] of Object.entries(contracts)) {
    contracts[ethers.utils.getAddress(key)] = contracts[key];
  }
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
    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    const tx = await ethers.provider.getTransaction(txHash);
    const txDesc = iface.parseTransaction(tx);
    console.log(tx);
    console.log("description");
    console.log(txDesc.args);

    let timelockTxDesc;
    let contractName;
    if (ethers.utils.getAddress(txDesc.args.to) == addresses.timelock) {
      timelockTxDesc = timelock.interface.parseTransaction({data: txDesc.args.data})
      console.log("timelock tx");
      console.log(timelockTxDesc.args.target);
      contractName = contracts[timelockTxDesc.args.target];
      if (!contractName || contractName == "") {
        console.log("couldn't find inner contract for tx ", txHash)
        return;
      }

    } else {
      console.log(txDesc.args.to);
      const c = contracts[txDesc.args.to];
      if (!c || c == "") {
        console.log("couldn't find contract for tx ", txHash)
        continue;
      }
      const Contract = await ethers.getContractFactory(c)
      const contract = Contract.attach(txDesc.args.to)
      timelockTxDesc = contract.interface.parseTransaction({data: txDesc.args.data})
      contractName = c;
    }
    console.log("inner tx ", timelockTxDesc);
    console.log(contractName);
    const Bond = await ethers.getContractFactory(contractName)
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




