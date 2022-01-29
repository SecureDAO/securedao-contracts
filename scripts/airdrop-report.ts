import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import * as processed from "../airdrop.json";
import * as snapshotData from "../airdrop-snapshot.json";
import * as fs from "fs";

const getUnixTime = function(date:Date) { return date.getTime()/1000|0 };

async function main() {
  console.log("starting")
  const gwei = ethers.BigNumber.from(1e9);
  let inputs: {[key:string]: BigNumber|string}[] = []
  let total = 0;
  let skipped = 0;
  let rejectAddresses:string[] = [];
  let balances: {[key:string]: BigNumber} = {};
  for (let i in snapshotData.entries) {
    let e = snapshotData.entries[i];
    balances[e.address] = ethers.BigNumber.from(e.balance);
  }

  for (let k in processed) {
    total++
    let e = processed[k]
    let addr = e["address"];
    if (!addr || ethers.utils.getAddress(addr) in rejectAddresses) {
      console.log("addr ", addr, " rejected")
      continue
    }
    let combined = balances[addr];
    if (combined.lt(gwei)) {
      skipped++
      console.log("combined balance too low ", e["address"])
      continue
    }

    let n: {[key:string]: BigNumber|string} = {}
    n["stake"] = e["stake"] ? BigNumber.from(e["stake"]) : BigNumber.from('0')
    n["stakeScaled"] = e["stakeScaled"] ? BigNumber.from(e["stakeScaled"]) : BigNumber.from('0')
    n["unstake"] = e["unstake"] ? BigNumber.from(e["unstake"]) : BigNumber.from('0')
    n["address"] = e["address"]
    n["combined"] = combined;
    inputs[k] = n;
  }

  let totals: string[][] = [];
  for (let k in inputs) {
    console.log(inputs[k])

    let e = inputs[k]
    let points:BigNumber = (e["stakeScaled"] as BigNumber).add(e["combined"]);
    if ((e["unstake"] as BigNumber).eq(BigNumber.from('0'))) {
      if (points.eq(0)) {
        console.log(e["address"], " got the bonus but had no points")
      }
      points = (points as BigNumber).mul(2)

    }
    let addr:string = (e["address"] as string)
    totals.push([addr, points.toString()])
  }

  totals.sort((x,y) => { return BigNumber.from(x[1]).gt(BigNumber.from(y[1])) ? 1 : -1 })

  console.log(totals);
  fs.writeFileSync('totals.json', JSON.stringify({totals}, null, 4))
  console.log(skipped)
  console.log(total)
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


