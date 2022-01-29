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

  const vault = new ethers.Contract(addresses.beetsVault, BalancerVault);
  const helpers = new ethers.Contract(addresses.beetsHelpers, BalancerHelpers);
  const chef = new ethers.Contract(addresses.beetsMasterChef, BeetsMasterChef, owner1);

  const fBeets = new ethers.Contract(addresses.fBeets, BeetsBar);
  const beets = new ethers.Contract(addresses.beets, ERC20, owner1);
  const fBeetsBPT = new ethers.Contract(addresses.fBeetsBPT, ERC20);
  const masterchef = new ethers.Contract(addresses.beetsMasterChef, BeetsMasterChef, owner1);
  console.log("beets before", await masterchef.userInfo(fBeetsPID, safeAddress));
  const chefPIDs = [
    fBeetsPID,
    ziggyStardustPID,
    preludeChefPID,
  ]

  const pending = await Promise.all(
    chefPIDs.map(
      (pid:string)=>{return masterchef.pendingBeets(pid, safeAddress)}
    ).concat(
     [beets.balanceOf(safeAddress)]
    ),
  )
  console.log("foobarbaz")
  let pendingBeets = BigNumber.from(0)
  pending.map((x:BigNumber)=>{pendingBeets = pendingBeets.add(x)});

  const amountIn = pendingBeets;
  const amountsIn = [0, amountIn];
  console.log(pendingBeets)
  console.log("meow")
  const request = {
            assets: [
              addresses.wftm,
              addresses.beets,
            ],
            maxAmountsIn: amountsIn,
            userData: WeightedPoolEncoder.joinExactTokensInForBPTOut(amountsIn, 0),
            fromInternalBalance: false,
          };
  console.log("meow")
  let response = await helpers.connect(owner1).callStatic.queryJoin(fBeetsPoolID, safeAddress, safeAddress, request);
  console.log("meow")
  let bptOut = response.bptOut;

  console.log(bptOut);
  bptOut = bptOut.mul(95).div(100)

  request.userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(amountsIn, bptOut);

  const datas = [
    beets.interface.encodeFunctionData(
      "approve",
      [
        addresses.beetsVault,
        pendingBeets,
      ]
    ),
    chef.interface.encodeFunctionData(
      "harvestAll",
      [
        chefPIDs,
        safeAddress,
      ],
    ),
    vault.interface.encodeFunctionData(
      "joinPool",
      [
        fBeetsPoolID,
        safeAddress,
        safeAddress,
        request,
      ]
    ),
    fBeetsBPT.interface.encodeFunctionData(
      "approve",
      [
        addresses.fBeets,
        bptOut
      ]
    ),
    fBeets.interface.encodeFunctionData(
      "enter",
      [
        bptOut
      ]
    ),
    fBeets.interface.encodeFunctionData(
      "approve",
      [
        addresses.beetsMasterChef,
        bptOut
      ]
    ),
    masterchef.interface.encodeFunctionData(
      "deposit",
      [
        fBeetsPID,
        bptOut.mul(9).div(10),
        safeAddress
      ]
    ),
  ]

  let targets = [
    beets.address,
    chef.address,
    vault.address,
    fBeetsBPT.address,
    fBeets.address,
    fBeets.address,
    masterchef.address,
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
      console.log(targets[i]);
      await multisig.sendTransaction({
        to: targets[i],
        value: 0,
        data: datas[i],
      }).then(tx=>tx.wait());
    }
  } else {
    let tx = GnosisMultiSend.prepareMetaTransactions(datas, targets);
    await multi.send(tx,{});
  }
  console.log("beets after", await masterchef.userInfo(fBeetsPID, safeAddress));
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })





