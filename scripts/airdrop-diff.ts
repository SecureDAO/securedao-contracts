import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import { ChainlinkBondingCalculatorDeployer, BondDepositoryV2Deployer } from "../utils/deploy-ts";
import * as batches from "../batches.json";
import * as oldBatches from "../batches-old.json";
import * as fs from "fs";

async function main() {
  let amounts: {[key:string]: BigNumber} = {}
  let amountsOld: {[key:string]: BigNumber} = {}
  let input: {[key:string]: string}[][] = batches.batches;
  let inputOld: {[key:string]: string}[][] = oldBatches.batches;

  for (let i in input) {
    for (let j in input[i]) {
      try {
        amounts[input[i][j].address] = BigNumber.from(input[i][j].receive)
      } catch (error) {
        console.log(input[i][j]);
        throw error
      }
    }
  }
  for (let i in inputOld) {
    for (let j in inputOld[i]) {
      try {
        amountsOld[inputOld[i][j].address] = BigNumber.from(inputOld[i][j].receive)
      } catch (error) {
        console.log(input[i][j]);
        throw error
      }
    }
  }
  let diffs = []
  for (let i in amounts) {
    let oldamount = amountsOld[i];
    if (!oldamount) {
      oldamount = BigNumber.from('0')
    }
    let diff;
    try {
      diff = amounts[i].sub(oldamount)
    } catch (error) {
      console.log(amounts[i], oldamount);
      throw error;
    }
    console.log(i, "diff amount", diff.toString())
    diffs.push({"address": i, "diff": diff})
  }
  let outputBatches = [];
  let batchSize = 10;
  for (let i =0; i < diffs.length; i+=batchSize) {
    let batch = [];
    for (let j = i; j < i+batchSize && j < diffs.length; j++) {
      let address = diffs[j].address
      let receive = diffs[j].diff.toString();
      batch.push({address,receive});
    }
    outputBatches.push(batch);
  }

  console.log(outputBatches)
  fs.writeFileSync('diff-batches.json', JSON.stringify({outputBatches}, null, 4))

  //console.log(batches)
  //fs.writeFileSync('batches.json', JSON.stringify({batches}, null, 4))
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})




