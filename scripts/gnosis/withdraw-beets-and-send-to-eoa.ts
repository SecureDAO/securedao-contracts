import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { BeetsBar, BeetsMasterChef, BalancerHelpers, BalancerVault, ERC20, UniswapV2Router02 } from "../../abi";
import { addresses, contracts, fBeetsPID, ziggyStardustPID, preludeChefPID, fBeetsPoolID } from "../constants";
import {GnosisMultiSend} from "../../gnosis";
import { WeightedPoolEncoder } from "@balancer-labs/balancer-js";

async function main() {
  const debug = false;
  //const debug = true;

  const safeAddress = "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88";
  const securedaoftm = "0x6Da6Acc0abb6Fbff92b5Da43d20934fC6B4a4115";
  let owner1;
  let multisig;
  if (debug) {
    console.log("debug mode");
    const [deployer] = await ethers.getSigners();

    owner1 = deployer;
  } else {
    console.log("running live");
    let provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:1248");
    owner1 = provider.getSigner();
  }

  let multi = new GnosisMultiSend(safeAddress, owner1);

  let block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber())
  console.log("timestamp ", block.timestamp);

  const chef = new ethers.Contract(addresses.beetsMasterChef, BeetsMasterChef, owner1);

  const beets = new ethers.Contract(addresses.beets, ERC20, owner1);
  const masterchef = new ethers.Contract(addresses.beetsMasterChef, BeetsMasterChef, owner1);

  const multisigBeetBal = await beets.balanceOf(safeAddress);
  console.log("beets before", await masterchef.userInfo(fBeetsPID, safeAddress));
  console.log("beets before eoa", await beets.balanceOf(securedaoftm));

  const chefPIDs = [
    fBeetsPID,
    ziggyStardustPID,
    preludeChefPID,
  ]

  let info = await masterchef.userInfo(fBeetsPID, safeAddress);
  let chefDepositedFBeets = info.amount;
  const datas = [
    chef.interface.encodeFunctionData(
      "harvestAll",
      [
        chefPIDs,
        securedaoftm,
      ],
    ),
    chef.interface.encodeFunctionData(
      "withdrawAndHarvest",
      [
        fBeetsPID,
        chefDepositedFBeets,
        securedaoftm,
      ],
    ),
    beets.interface.encodeFunctionData(
      "transfer",
      [
        securedaoftm,
        multisigBeetBal,
      ],
    )
  ]

  let targets = [
    chef.address,
    chef.address,
    beets.address,
  ]

  if (debug) {
    const accountToInpersonate = addresses.multisig
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToInpersonate],
    });
    multisig = await ethers.getSigner(accountToInpersonate)

    await owner1.sendTransaction({
      to: multisig.address,
      value: ethers.utils.parseEther("1000.0")
    }).then(tx=>tx.wait());

    for (let i = 0; i < datas.length; i++) {
      await multisig.sendTransaction({
        to: targets[i],
        value: 0,
        data: datas[i],
      }).then(tx=>tx.wait());
    }
  } else {
    let tx = GnosisMultiSend.prepareMetaTransactions(datas, targets);
    await multi.send(tx);
  }
  console.log("beets after", await masterchef.userInfo(fBeetsPID, safeAddress));
  console.log("beets after eoa", await beets.balanceOf(securedaoftm));
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })






