import { ethers } from "hardhat";
import { addresses, contracts } from "./constants";
const BigNumber = ethers.BigNumber;
import inputJson from "../prepare-batch-inputs.json";
import * as fs from "fs";

interface TimelockTransaction {
  id: string;
  name: string;
  functionName: string;
  value: number;
  delay?: number;
  predecessor?: string;
  salt?: string;
  args: any[];
}

interface BatchPrepare {
  transactions: TimelockTransaction[];
  delay: number;
  predecessor: string;
  salt: string;
}

async function main() {
  const ether = BigNumber.from('10').pow(18);
  const zero32 = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32)
  const gwei = BigNumber.from('10').pow(9);

  const Timelock = await ethers.getContractFactory("Timelock");
  const timelock = Timelock.attach(addresses.timelock);
  const zero = ethers.utils.hexZeroPad(ethers.utils.hexlify(0), 32)

  let batches: BatchPrepare[] = inputJson.inputJson;

  let outputs = []
  for (let inputs of batches) {
    let targets = [];
    let values = [];
    let datas = [];

    for (let input of inputs.transactions) {
      const Contract = await ethers.getContractFactory(contracts[addresses[input.name]])

      targets.push(addresses[input.name])
      values.push(input.value)
      let funcData = Contract.interface.encodeFunctionData(input.functionName, input.args);
      datas.push(funcData)
    }

    let args = [
      targets,
      values,
      datas,
      inputs.predecessor,
      inputs.salt,
      inputs.delay,
    ]
    let timelockSchedFuncData = Timelock.interface.encodeFunctionData("scheduleBatch", args)

    let timelockExecFuncData = Timelock.interface.encodeFunctionData("executeBatch", args.slice(0,5))

    outputs.push({
      input: inputs,
      timelockScheduleData: timelockSchedFuncData,
      timelockExecuteData: timelockExecFuncData,
    })
  }

  fs.writeFileSync('prepare-batch-output.json', JSON.stringify(outputs, null, 4))
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})





