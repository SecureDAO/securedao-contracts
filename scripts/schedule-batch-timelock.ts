import hre from "hardhat";
import { ethers } from "hardhat";
import {GnosisMultiSend} from "../gnosis";
import { addresses } from "./constants";
import {Signer} from "ethers";
import inputs from "../prepare-batch-output.json";

async function main() {
  const debug = process.env["DEBUG"] ? true : false;
  let deployer:Signer;
  if (debug) {
    [deployer] = await ethers.getSigners();
  } else {
    console.log("running live");
    let provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:1248");
    deployer = provider.getSigner();
  }

  const datas = inputs.map((i:any) => {
    return i.timelockScheduleData
  })

  const targets = inputs.map(() => {
    return addresses.timelock;
  })
  if (debug) {
    const accountToInpersonate = addresses.multisig
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToInpersonate],
    });
    let multisig = await ethers.getSigner(accountToInpersonate)

    await deployer.sendTransaction({
      to: multisig.address,
      value: ethers.utils.parseEther("1000.0")
    }).then((tx:any)=>tx.wait());

    await GnosisMultiSend.debug(multisig, datas, targets);

    // SKIP TIME
    await hre.network.provider.send("evm_increaseTime", [43200])
    await hre.network.provider.send("evm_mine")

    const execDatas = inputs.map((i:any) => {
      return i.timelockExecuteData
    })
    await GnosisMultiSend.debug(multisig, execDatas, targets);
  } else {
    let tx = GnosisMultiSend.prepareMetaTransactions(datas, targets);
    let multi = await GnosisMultiSend.create(addresses.multisig, deployer);
    await multi.send(tx,{});
  }
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})
