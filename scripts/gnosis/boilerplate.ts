import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { BalancerHelpers, BalancerVault, ERC20, UniswapV2Router02 } from "../../abi";
import { addresses, contracts } from "../constants";
import {GnosisMultiSend} from "../../gnosis";

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

  let datas = []
  let targets = []

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
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })




