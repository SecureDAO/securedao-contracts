const { ethers } = require("hardhat");
const { addresses, contracts } = require("./constants.js");
const BigNumber = ethers.BigNumber;
const fs = require('fs')
const gnosisSafeABI = fs.readFileSync('./abi/GnosisSafe.json', 'utf8')
const inputs = require("../prepare-output.json");
async function main() {
  const ether = BigNumber.from('10').pow(18);
  const gwei = BigNumber.from('10').pow(9);
  const accountToInpersonate = addresses.multisig
  //const accountToInpersonate = addresses.timelock;
  const [deployer] = await ethers.getSigners();

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountToInpersonate],
  });
  const signer = await ethers.getSigner(accountToInpersonate)

  await deployer.sendTransaction({
    to: signer.address,
    value: ethers.utils.parseEther("1000.0")
  }).then(tx=>tx.wait());

  for (let input of inputs) {
    await signer.sendTransaction({
      to: addresses.timelock,
      value: 0,
      data: input.timelockScheduleData,
    }).then(tx=>tx.wait());
  }

  // SKIP TIME
  await network.provider.send("evm_increaseTime", [43200])
  await network.provider.send("evm_mine")

  for (let input of inputs) {
    try {
      await signer.sendTransaction({
        to: addresses.timelock,
        value: 0,
        data: input.timelockExecuteData,
      }).then(tx=>tx.wait());
    } catch (e) {
      console.log(input.input.txID)
      console.log(e)
      return
    }
  }
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})



