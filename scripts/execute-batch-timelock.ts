import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import inputs from "../prepare-batch-output.json";

async function main() {
  const debug = false;
  //const debug = true;

  let signer;
  if (debug) {
    console.log("debug mode");
    const accountToInpersonate = "0x433596383A281E5417da4C3C393c2d8c693c4d4b";
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToInpersonate],
    });
    signer = await ethers.getSigner(accountToInpersonate)
  } else {
    console.log("running live");
    [signer] = await ethers.getSigners();
  }

  for (let input of inputs) {
    try {
      await signer.sendTransaction({
        to: addresses.timelock,
        value: 0,
        data: input.timelockExecuteData,
      }).then((tx:any)=>tx.wait());
    } catch (e) {
      //console.log(input.input.id)
      console.log(e)
      return
    }
  }
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })






