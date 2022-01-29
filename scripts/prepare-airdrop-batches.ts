import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import { ChainlinkBondingCalculatorDeployer, BondDepositoryV2Deployer } from "../utils/deploy-ts";
import * as input from "../totals.json";
import * as fs from "fs";

async function main() {
  let totalScr = ethers.BigNumber.from('1650').mul(1e9)
  let total = ethers.BigNumber.from('0');
  let totals = input.totals;
  console.log(totals)
  console.log(totals.length)
  for (let i =0; i < totals.length; i++) {
    console.log(i)
    console.log(totals[i])
    let amount = totals[i][1]
    console.log(amount)
    total = total.add(amount ? ethers.BigNumber.from(amount) : ethers.BigNumber.from('0'))
  }

  console.log(total)
  let batches = [];
  let batchSize = 10;
  for (let i =0; i < totals.length; i+=batchSize) {
    let batch = [];
    for (let j = i; j < i+batchSize && j < totals.length; j++) {
      let address = totals[j][0]
      let amount = ethers.BigNumber.from(totals[j][1])
      let receive = amount.mul(totalScr).div(total).toString();
      batch.push({address,receive});
    }
    batches.push(batch);
  }

  console.log(batches)
  fs.writeFileSync('batches.json', JSON.stringify({batches}, null, 4))
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})



