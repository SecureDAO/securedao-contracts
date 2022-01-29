import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import * as data from "../output.json";
import * as fs from "fs";

const getUnixTime = function(date:Date) { return date.getTime()/1000|0 };

const callWithRetry = async (fn:any, depth = 1):Promise<any> => {
  const maxDepth = 15;
	try {
		return await fn.then((resp:any) => {
      return resp;
    }).catch((e:any) => {
      throw e;
    });
	}catch(e) {
		if (depth > maxDepth) {
      console.log("too many retries")
			throw e;
		}
		await new Promise(r => setTimeout(r,(2 ** depth) * 125));

		return callWithRetry(fn, depth + 1);
	}
}

async function main() {
  console.log("starting")
  let sSCR = (await ethers.getContractFactory(contracts[addresses.staked_scr])).attach(addresses.staked_scr)
  let staking = (await ethers.getContractFactory(contracts[addresses.staking])).attach(addresses.staking)
  const startTime = 1639785600;
  const snapshotBlock = 29629300;
  let output = [];
  let addrs: {[key:string]:boolean} = {};
  for(let i in data) {
    let entry: {[key:string]:any} = data[i];
    let addr = entry["From"];
    addrs[addr] = true;
  }
  let validAddrs = [];
  for(let i in addrs) {
    let addr = i;
    console.log(addr)
    if (!addr || addr == "undefined") {
      console.log("skipping")
      continue
    }
    validAddrs.push(addr);
  }
  for (let i in validAddrs) {
    let addr = validAddrs[i]
    console.log(addr)
    let entry: {[key:string]:string} = {};
    let attempts = 0
    let maxAttempts = 5
    let bal;
    let warmupBal
    [warmupBal, bal] = await Promise.all(
      [
        callWithRetry(
          staking.warmupInfo(addr,{blockTag: snapshotBlock}).then(
            (warmupBefore:any) => {
              return callWithRetry(sSCR.balanceForGons(warmupBefore.gons,{blockTag:snapshotBlock}));
            }
          )
        ),
        callWithRetry(
          sSCR.balanceOf(addr, {blockTag: snapshotBlock})
        ),
      ],
    )

    let out = {
      "address": addr,
      "balance": warmupBal.add(bal).toString(),
    }

    output.push(out);
  }
  fs.writeFileSync('airdrop-snapshot.json', JSON.stringify({entries:output}, null, 4))
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})



    //let bal
    //while (true) {
    //  try {
    //    bal = await sSCR.balanceOf(addr, {blockTag: snapshotBlock})
    //    break
    //  } catch(error) {
    //    if (attempts >= maxAttempts) {
    //      throw error
    //    }
    //    console.log("trying again")
    //    attempts++
    //  }
    //}
    //attempts = 0
    //let warmUpBal
    //while (true) {
    //  try {
    //    warmUpBal = await staking.warmupInfo(addr,{blockTag: snapshotBlock})
    //    break
    //  } catch(error) {
    //    if (attempts >= maxAttempts) {
    //      throw error
    //    }
    //    console.log("trying again")
    //    attempts++
    //  }
    //}

    //entry["bal"] = bal ? bal.toString() : "0";
    //entry["warmup"] = warmUpBal ? warmUpBal.deposit.toString() : "0";
    //console.log("bal ", bal, " warmup bal ", warmUpBal)

