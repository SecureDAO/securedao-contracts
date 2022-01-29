import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import * as data from "../output.json";
import * as snapshotData from "../airdrop-snapshot.json";
import * as fs from "fs";

const getUnixTime = function(date:Date) { return date.getTime()/1000|0 };

const callWithRetry = async (fn:any, depth = 1):Promise<any> => {
	try {
		return await fn.then((resp:any) => {
      return resp;
    }).catch((e:any) => {
      throw e;
    });
	}catch(e) {
		if (depth > 7) {
      console.log("too many retries")
			throw e;
		}
		await new Promise(r => setTimeout(r,(2 ** depth) * 125));

		return callWithRetry(fn, depth + 1);
	}
}

async function main() {
  console.log("starting")
  let snapshot: {[key:string]: string} = {}
  for (let i = 0; i < snapshotData.entries.length; i++) {
    let e = snapshotData.entries[i];
    snapshot[e["address"]] = e["balance"];
  }
  const methods: {[key:string]: string} = {
    "Stake": "stake",
    //"Unstake": "unstake",
    //"Claim": "claim",
    "Purchase": "purchase",
    "Redeem": "redeem",
  }
  const gwei = BigNumber.from('1').mul(1e9);
  let sSCR = (await ethers.getContractFactory(contracts[addresses.staked_scr])).attach(addresses.staked_scr)
  let staking = (await ethers.getContractFactory(contracts[addresses.staking])).attach(addresses.staking)

  const endTime = getUnixTime(new Date("2022-02-01"));
  let unstakes: {[key:string]: BigNumber} = {}
  let unstakesScaled: {[key:string]: BigNumber} = {}
  let stakes: {[key:string]: BigNumber} = {}
  let stakesScaled: {[key:string]: BigNumber} = {}
  let claims: {[key:string]: BigNumber} = {}
  const includeMethods = [
"Stake", "Purchase", "Redeem",
  ]
  let redeems: {[key:string]: number[]} = {}
  for (let i in data) {
    console.log("foo")
    //console.log(data[i])
    if (!data[i].To) {
      console.log("no To")
      continue
    }
    let contract = contracts[ethers.utils.getAddress(data[i].To)]
    if (!contract) {
      console.log("couldn't find contract")
     continue
    }

    //console.log(contract)
    console.log(data[i].Method)
    if (includeMethods.indexOf(data[i].Method) == -1) {
      console.log("method not included")
      continue
    }
    let method = methods[data[i].Method]

    let addr = data[i].From
    let bal = snapshot[addr];
    if (ethers.BigNumber.from(bal).lt(gwei)) {
      console.log("bal too low");
      continue
    }
    let date = getUnixTime(new Date(data[i].Time));
    //console.log(data[i].Time);
    //console.log(date)
    let Contract = await ethers.getContractFactory(contract)
    //console.log(ethers.utils.hexlify(data[i].Data));
    let decoded = Contract.interface.decodeFunctionData(method, "0x" + data[i].Data)
    //console.log(decoded)
    if (method == "redeem") {
      console.log("decoded ", decoded)
      if (!decoded["_stake"]) {
        console.log("didn't stake, skipping")
        continue
      }
      let txHash = data[i].TxHash;
      let receipt = await callWithRetry(ethers.provider.getTransactionReceipt(txHash));

      let temp = stakes[data[i].From];
      if (!temp) {
        temp = BigNumber.from('0');
      }
      let amount;
      for (let j in receipt.logs) {
        let log = receipt.logs[j];
        if (!log.address) {
          continue
        }
        if (ethers.utils.getAddress(log.address) != ethers.utils.getAddress(addresses.staked_scr)) {
          console.log("skipping event, not for sSCR");
          continue
        }

        let LogContract = sSCR;
        let parsed = LogContract.interface.parseLog({data: receipt.logs[j].data, topics:receipt.logs[j].topics})
        console.log("parsed")
        console.log(parsed);
        if (parsed.eventFragment.name != 'Transfer') {
          console.log("not a transfer event")
          continue
        }

        if (ethers.utils.getAddress(parsed.args.from) == ethers.utils.getAddress(addresses.staking) && ethers.utils.getAddress(parsed.args.to) == ethers.utils.getAddress("0x544c670255D53D34163B87c10043bfa4e4d84F34")) {
          console.log(data[i].From, " transferred to warmup ", parsed.args.value)
          temp = temp.add(parsed.args.value);
          amount = parsed.args.value;
          break;
        } else if (ethers.utils.getAddress(parsed.args.from) == ethers.utils.getAddress(addresses.staking) && ethers.utils.getAddress(parsed.args.to) == ethers.utils.getAddress(addr)) {
          console.log(data[i].From, " transferred to wallet ", parsed.args.value)
          temp = temp.add(parsed.args.value);
          amount = parsed.args.value;
          break;
        }
      }
      stakes[data[i].From] = temp;

      if (!amount) {
        console.log("no amount found in logs")
        continue
      }
      temp = stakesScaled[data[i].From];
      if (!temp) {
        temp = BigNumber.from('0');
      }
      let scale = (endTime-date)
      if (date >= endTime) {
        console.log("data of tx is after endtime")
        continue
      }
      try {
        console.log("staked scaled", data[i].From, amount.mul(scale));
        stakesScaled[data[i].From] = temp.add(amount.mul(scale));
      } catch (error) {
        console.log("endtime ", endTime)
        console.log("data ", date)
        console.log("scale ", scale)
        console.log("temp ", temp)
        console.log("_amount ", decoded["_amount"])
        throw error
      }
    } else if (method == "purchase") {
      let temp = stakes[data[i].From];
      if (!temp) {
        temp = BigNumber.from('0');
      }
      stakes[data[i].From] = temp.add(gwei.mul(5));
      console.log(data[i].From, " purchased presale, adding ", gwei.mul(5));

      temp = stakesScaled[data[i].From];
      if (!temp) {
        temp = BigNumber.from('0');
      }
      let scale = (endTime-date)
      if (date >= endTime) {
        console.log("data of tx is after endtime")
        continue
      }
      try {
      stakesScaled[data[i].From] = temp.add(gwei.mul(5).mul(scale));
      } catch (error) {
        console.log("endtime ", endTime)
        console.log("data ", date)
        console.log("scale ", scale)
        console.log("temp ", temp)
        console.log("_amount ", decoded["_amount"])
        throw error
      }
    } else if (method == "stake") {
      let temp = stakes[data[i].From];
      if (!temp) {
        temp = BigNumber.from('0');
      }
      console.log(data[i].From, " staked ", decoded["_amount"]);
      stakes[data[i].From] = temp.add(decoded["_amount"]);

      temp = stakesScaled[data[i].From];
      if (!temp) {
        temp = BigNumber.from('0');
      }
      let scale = (endTime-date)
      if (date >= endTime) {
        console.log("data of tx is after endtime")
        continue
      }
      try {
      stakesScaled[data[i].From] = temp.add(decoded["_amount"].mul(scale));
      } catch (error) {
        console.log("endtime ", endTime)
        console.log("data ", date)
        console.log("scale ", scale)
        console.log("temp ", temp)
        console.log("_amount ", decoded["_amount"])
        throw error
      }
    }
  }

  let ratios: {[key:string]: BigNumber|string}[] = []
  //console.log(unstakes);
  //console.log(stakes);
  for(let addr in stakes) {
    let unstake = unstakes[addr];
    let unstakeScaled = unstakesScaled[addr];
    let stake = stakes[addr];
    let stakeScaled = stakesScaled[addr];
    let entry: {[key:string]: BigNumber|string} = {}

    entry["address"] = addr
    entry["unstake"] = unstake != null ? unstake.toString() : "0"
    entry["stake"] = stake != null ? stake.toString() : "0"
    entry["unstakeScaled"] = (unstakeScaled ? unstakeScaled.toString() : "0")
    entry["stakeScaled"] = (stakeScaled != null ? stakeScaled.toString() : "0")

    ratios.push(entry)
  }
  fs.writeFileSync('airdrop.json', JSON.stringify(ratios, null, 4))
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})
