import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber, Signer } from "ethers";
import {GnosisMultiSend} from "../gnosis";
import { addresses, contracts } from "./constants";

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
  const stableCoinReceipt = await ethers.getContractFactory("StableCoinReceipt")
    .then((c:any) => {
      return c.deploy("StableCoinReceipt", "SCREC")
        .then((c:any) => {
          return c.deployed()
        })
    })

  await stableCoinReceipt.transferOwnership(addresses.multisig).then((tx:any)=>{tx.wait()});
  console.log("StableCoinReceipt:", stableCoinReceipt.address);
  //const stableCoinReceipt:{[key:string]: string} = {address: "0xafCDd94301823B8f34d260e354B9f1DB3419A2d3"};
  const treasury = await ethers.getContractFactory(contracts[addresses.treasury])
    .then((c:any) => {
      return c.attach(addresses.treasury).connect(deployer)
    })
  const datas = [
    treasury.interface.encodeFunctionData("queue", [0, addresses.multisig]),
    treasury.interface.encodeFunctionData("toggle", [0, addresses.multisig, ethers.constants.AddressZero]),
    treasury.interface.encodeFunctionData("queue", [2, stableCoinReceipt.address]),
    treasury.interface.encodeFunctionData("toggle", [2, stableCoinReceipt.address, ethers.constants.AddressZero])
  ]
  const targets = [
    treasury.address,
    treasury.address,
    treasury.address,
    treasury.address
  ]
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

    await treasury.isReserveToken(stableCoinReceipt.address)
      .then((r:any)=>{console.log("is reserve token?", r)});
    const manager = await treasury.manager()
    await stableCoinReceipt.owner()
      .then((o:any)=>{
        console.log("owner is manager", manager == o);
      })
  } else {
    let tx = GnosisMultiSend.prepareMetaTransactions(datas, targets);
    let multi = new GnosisMultiSend(addresses.multisig, deployer);
    await multi.send(tx,{});
  }
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})

