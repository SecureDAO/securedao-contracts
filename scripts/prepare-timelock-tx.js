const { ethers } = require("hardhat");
const { addresses, contracts } = require("./constants.js");
const BigNumber = ethers.BigNumber;
const fs = require("fs")
const inputs = require("../prepare-inputs.json");

async function main() {
  const ether = BigNumber.from('10').pow(18);
  const zero32 = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32)
  const gwei = BigNumber.from('10').pow(9);

  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = Timelock.attach(addresses.timelock);
  const zero = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32)

  let outputs = []
  for (let input of inputs) {
    input.timeLockArgs.target = addresses[input.name];
    const Contract = await ethers.getContractFactory(contracts[addresses[input.name]])

    funcData = Contract.interface.encodeFunctionData(input.func, input.args);
    args = [
      input.timeLockArgs.target,
      input.timeLockArgs.value,
      funcData,
      input.timeLockArgs.predecessor,
      input.timeLockArgs.salt,
      input.timeLockArgs.delay,
    ]

    timelockSchedFuncData = Timelock.interface.encodeFunctionData("schedule", args)

    timelockExecFuncData = Timelock.interface.encodeFunctionData("execute", args.slice(0,5))

    outputs.push({
      input: input,
      timelockScheduleData: timelockSchedFuncData,
      timelockExecuteData: timelockExecFuncData,
    })
  }

  fs.writeFileSync('prepare-output.json', JSON.stringify(outputs, null, 4))
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})




