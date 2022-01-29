import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { BalancerHelpers, BalancerVault, ERC20, UniswapV2Router02 } from "../../abi";
import { addresses, contracts } from "../constants";
import {GnosisMultiSend} from "../../gnosis";
import { WeightedPoolEncoder } from "@balancer-labs/balancer-js";

async function main() {
  const debug = false;
  //const debug = true;

  const safeAddress = "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88";
  const preludeToSecurity = "0xc4dac57a46a0a1acd0eb95eddef5257926279960000200000000000000000150";

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

  let lp = new ethers.Contract(addresses.scrMIMSpiritLP, ERC20, owner1);
  let wftm = new ethers.Contract(addresses.scr, ERC20, owner1);
  let scr = new ethers.Contract(addresses.wftm, ERC20, owner1);
  let scrWftmBPT = new ethers.Contract("0xc4dAC57A46a0a1acd0eB95EDDeF5257926279960", ERC20, owner1);
  let lpAmount = (await lp.balanceOf(addresses.treasury)).div(3);
  let treasury = await ethers.getContractFactory(contracts[addresses.treasury]);
  let spiritswap = new ethers.Contract(addresses.spiritSwapRouter, UniswapV2Router02, owner1);
  const vault = new ethers.Contract(addresses.beethovenVault, BalancerVault, owner1);
  const helpers = new ethers.Contract(addresses.beetsHelpers, BalancerHelpers, owner1);

  let block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber())
  console.log("timestamp ", block.timestamp);

  const scrAmountOut = BigNumber.from('600').mul(1e9);
  const scrAmountIn = scrAmountOut.add(BigNumber.from('400').mul(1e9));
  const wftmAmountIn = ethers.constants.WeiPerEther.mul(1200);
  const mimAmountOut = ethers.constants.WeiPerEther.mul(6000);

  const amountsIn = [wftmAmountIn, scrAmountIn];

  const request = {
    assets: [
      addresses.wftm,
      addresses.scr,
    ],
    maxAmountsIn: [wftmAmountIn, scrAmountIn],
    userData: WeightedPoolEncoder.joinExactTokensInForBPTOut(amountsIn, 0),
    fromInternalBalance: false,
  };
  console.log("callstatic");
  let response = await helpers.connect(owner1).callStatic.queryJoin(preludeToSecurity, safeAddress, safeAddress, request);
  let bptOut = response.bptOut;

  console.log(bptOut);
  bptOut = bptOut.mul(95).div(100)
  request.userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(amountsIn, bptOut);
  let datas = [
    treasury.interface.encodeFunctionData(
      "manage",
      [addresses.scrMIMSpiritLP, lpAmount]
    ),
    lp.interface.encodeFunctionData(
      "approve",
      [addresses.spiritSwapRouter, ethers.constants.MaxUint256]
    ),
    spiritswap.interface.encodeFunctionData(
      "removeLiquidity",
      [
        addresses.scr,
        addresses.mim,
        lpAmount,
        scrAmountOut,
        mimAmountOut,
        addresses.multisig,
        block.timestamp+(3600*12),
      ]
    ),
    vault.interface.encodeFunctionData(
      "joinPool",
      [
        preludeToSecurity,
        safeAddress,
        safeAddress,
        request,
      ]
    ),
  ]
  let targets = [addresses.treasury, addresses.scrMIMSpiritLP, addresses.spiritSwapRouter, addresses.beethovenVault]

  if (debug) {
    console.log("balance before ", await scrWftmBPT.balanceOf(addresses.multisig));
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
    console.log("balance after ", await scrWftmBPT.balanceOf(addresses.multisig));
  } else {
    let tx = GnosisMultiSend.prepareMetaTransactions(datas, targets);
    await multi.send(tx);
  }
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })



