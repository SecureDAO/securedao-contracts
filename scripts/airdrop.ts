import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import { ChainlinkBondingCalculatorDeployer, BondDepositoryV2Deployer } from "../utils/deploy-ts";
import * as input from "../diff-batches.json";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("deploying with address ", deployer.address);
    let batches:{[key:string]: string}[][] = input.outputBatches;
    //const accountToInpersonate = addresses.multisig
    //await hre.network.provider.request({
    //  method: "hardhat_impersonateAccount",
    //  params: [accountToInpersonate],
    //});
    //const signer = await ethers.getSigner(accountToInpersonate)

    //let tx = await deployer.sendTransaction({
    //  to: signer.address,
    //  value: ethers.utils.parseEther("1000.0")
    //});
    //tx.wait();
    let signer = deployer;
    let tx;
    let scr = (await ethers.getContractFactory(contracts[addresses.scr])).attach(addresses.scr);

    let airdrop = await (await ethers.getContractFactory("Airdrop")).deploy(
      scr.address
    );
    await airdrop.deployed();
    //let airdrop = await (await ethers.getContractFactory("Airdrop")).attach(
    //  "0xb3cd0824f0bf63d5a0d377338642649110cb5335"
    //);


    console.log((await scr.balanceOf(signer.address)).toString());
    console.log(signer.address)
    tx = await scr.connect(signer).transfer(airdrop.address, ethers.BigNumber.from('750').mul(1e9));
    tx.wait();

    let allAddresses = [];
    let allAmounts = [];
    for (let i in batches) {
      let b:{[key:string]: string}[] = batches[i];
      let addresses = [];
      let amounts = [];
      for (let j in b) {
        let e:{[key:string]: string} = b[j]
        allAddresses.push(e["address"]);
        allAmounts.push(ethers.BigNumber.from(e["receive"]));
        addresses.push(e["address"]);
        amounts.push(e["receive"]);
      }
      console.log("batch size ", addresses.length)
      let tx = await airdrop.setBatch(i, addresses, amounts);
      tx.wait();
    }

    let blockNum = await ethers.provider.getBlockNumber();
    let balances = [];
    console.log("num all addresses ", allAddresses.length)
    for (let i in  allAddresses) {
      console.log(allAddresses[i])
      balances.push(await scr.balanceOf(allAddresses[i], {blockTag: blockNum}));
      await new Promise(r => setTimeout(r, 500));
    }

    for (let i in batches) {
      let tx = await airdrop.sendBatch(i);
      tx.wait();
    }

    console.log("waiting")
    await new Promise(r => setTimeout(r, 15000));

    for (let i in  allAddresses) {
      console.log(allAddresses[i])
      let bal = await scr.balanceOf(allAddresses[i])
      let diff = allAmounts[i].add(balances[i])
      if (!diff.eq(bal)) {
        throw ("Does not match " +  bal+ " expected " +diff)
      }
      await new Promise(r => setTimeout(r, 500));
    }
    let airdropBal = await scr.balanceOf(airdrop.address);
    if (!airdropBal.eq("0")) {
      console.log("airdrop still holding tokens " + airdropBal)
    }
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


