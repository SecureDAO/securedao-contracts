import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import { SnapshotDelegation } from "../abi";
import * as fs from "fs";


async function main() {
  let [signer] = await ethers.getSigners();
  console.log("starting")
  //let txHash = "0x62dc26a3ae99730b80bf74152b91346ad7e396659a674af10b64bba3dd527c2a"
  let txHash = "0xe5a9ef0a6b97db7f362d7264ba97cda885d1b51f5e10d1a68ba43847ebca0fa2";
  let tx = await ethers.provider.getTransaction(txHash);
  console.log(tx);
  let Contract = new ethers.Contract("0x469788fe6e9e9681c6ebf3bf78e7fd26fc015446", SnapshotDelegation, signer);
  let decoded = Contract.interface.parseTransaction(tx);
  console.log(decoded)
  let delegateAddr = await Contract.delegation(decoded.args.delegate, decoded.args.id)
  console.log(delegateAddr);
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


