import hre from "hardhat";
import { ethers } from "hardhat";
import {GnosisMultiSend} from "../gnosis";
import { addresses, contracts } from "./constants";
import { ERC20 } from "../abi";
import {Signer} from "ethers";

async function main() {
  const receiptAddress = "0xafCDd94301823B8f34d260e354B9f1DB3419A2d3";
  const debug = process.env["DEBUG"] ? true : false;
  let deployer:Signer;
  if (debug) {
    [deployer] = await ethers.getSigners();
  } else {
    console.log("running live");
    let provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:1248");
    deployer = provider.getSigner();
  }
  const erc20 = new ethers.Contract(ethers.constants.AddressZero, ERC20)
  const stableCoinReceipt = await ethers.getContractFactory("StableCoinReceipt")
    .then((c:any) => {
      return c.attach(receiptAddress, deployer)
    });

  const treasury = await ethers.getContractFactory(contracts[addresses.treasury])
    .then((c:any) => {
      return c.attach(addresses.treasury).connect(deployer)
    });
  const mimBal = (await erc20.attach(addresses.mim).connect(deployer).balanceOf(treasury.address));
  const daiBal = (await erc20.attach(addresses.dai).connect(deployer).balanceOf(treasury.address));
  const stablesBal = mimBal.add(daiBal);

  const scrSupply = await erc20.attach(addresses.scr).connect(deployer).totalSupply();
  console.log("stables balance", stablesBal);
  const datas = [
    stableCoinReceipt.interface.encodeFunctionData("mint", [stablesBal]),
    stableCoinReceipt.interface.encodeFunctionData("approve", [treasury.address, stablesBal]),
    treasury.interface.encodeFunctionData(
      "deposit", [
        stablesBal,
        stableCoinReceipt.address,
        stablesBal.mul(1e9).div(ethers.constants.WeiPerEther)
      ]
    ),
    treasury.interface.encodeFunctionData(
      "manage", [
        addresses.mim,
        mimBal
      ]
    ),
    treasury.interface.encodeFunctionData(
      "manage", [
        addresses.dai,
        daiBal
      ]
    )
  ];
  const targets = [
    stableCoinReceipt.address,
    stableCoinReceipt.address,
    treasury.address,
    treasury.address,
    treasury.address
  ];
  if (debug) {
    console.log("excess reserves",await treasury.excessReserves());
    console.log("multisig mim balance", await erc20.attach(addresses.mim).connect(deployer).balanceOf(addresses.multisig));
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

    console.log("treasury receipts",await stableCoinReceipt.balanceOf(treasury.address));
    console.log(
      "new scr",
      (await erc20.attach(addresses.scr).connect(deployer).totalSupply()).sub(scrSupply)
    );
    console.log("excess reserves",await treasury.excessReserves());
    console.log("multisig mim balance", await erc20.attach(addresses.mim).connect(deployer).balanceOf(addresses.multisig));
  } else {
    let tx = GnosisMultiSend.prepareMetaTransactions(datas, targets);
    let multi = new GnosisMultiSend(addresses.multisig, deployer);
    await multi.send(tx,{nonce:183});
  }
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


