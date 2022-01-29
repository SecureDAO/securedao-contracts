import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { BeetsBar, BeetsMasterChef, BalancerHelpers, BalancerVault, ERC20, UniswapV2Router02 } from "../../abi";
import { addresses, contracts, fBeetsPID, ziggyStardustPID, ziggyPoolID, fBeetsPoolID } from "../constants";
import {GnosisMultiSend} from "../../gnosis";
import { WeightedPoolEncoder } from "@balancer-labs/balancer-js";

async function main() {
  const debug = false;
  //const debug = true;

  const safeAddress = "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88";

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

  const vault = new ethers.Contract(addresses.beetsVault, BalancerVault, owner1);
  const helpers = new ethers.Contract(addresses.beetsHelpers, BalancerHelpers, owner1);
  const mim = new ethers.Contract(addresses.mim, ERC20, owner1);
  const ziggyBPT = new ethers.Contract(addresses.ziggyStardustBPT, ERC20, owner1);
  const masterchef = new ethers.Contract(addresses.beetsMasterChef, BeetsMasterChef, owner1);

  const [ziggyBalance] = await masterchef.userInfo(ziggyStardustPID, safeAddress);
  const [tokens] = await vault.getPoolTokens(ziggyPoolID);
  const tokenIndexes:{[key:string]:number} = {}
  tokens.map((t:string, idx:number) => {
    tokenIndexes[t] = idx;
  })
  console.log("meow", tokenIndexes)
  console.log("mim balance", await mim.balanceOf(safeAddress));
  console.log("ziggy balance", ziggyBalance)
  console.log("tokens", tokens)
  let request = {
            assets: tokens,
            minAmountsOut: [0, 0, 0],
            userData: WeightedPoolEncoder.exitExactBPTInForOneTokenOut(ziggyBalance, tokenIndexes[addresses.mim]),
            fromInternalBalance: false,
          };

  let response = await helpers.callStatic.queryExit(ziggyPoolID, safeAddress, safeAddress, request);
  let amountsOut = response.amountsOut.map((i:any) => {return i});

  console.log(amountsOut);
  let mimOut = amountsOut[tokenIndexes[addresses.mim]];
  mimOut = mimOut.mul(95).div(100);
  amountsOut[tokenIndexes[addresses.mim]] = mimOut;

  request.minAmountsOut = amountsOut;

  const datas = [
    masterchef.interface.encodeFunctionData(
      "withdrawAndHarvest",
      [
        ziggyStardustPID,
        ziggyBalance,
        safeAddress
      ]
    ),
    ziggyBPT.interface.encodeFunctionData(
      "approve",
      [
        vault.address,
        ziggyBalance,
      ],
    ),
    vault.interface.encodeFunctionData(
      "exitPool",
      [
        ziggyPoolID,
        safeAddress,
        safeAddress,
        request,
      ]
    ),
  ]

  let targets = [
    masterchef.address,
    ziggyBPT.address,
    vault.address,
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
    //await multi.send(tx,{nonce: 163});
    await multi.send(tx,{});
  }
  console.log("mim balance", await mim.balanceOf(safeAddress));
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })






