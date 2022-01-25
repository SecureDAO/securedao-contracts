import hre from "hardhat";
import { WeightedPoolEncoder } from "@balancer-labs/balancer-js";
import { ethers } from "hardhat";
import Safe from '@gnosis.pm/safe-core-sdk';
import { MetaTransactionData, SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import { SafeTransactionOptionalProps, ContractNetworksConfig, EthersAdapter, SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';
import { SafeEthersSigner, SafeService } from '@gnosis.pm/safe-ethers-adapters';
import { BeetsMasterChef, BalancerVault, ERC20 } from "../../abi";
import { addresses, contracts } from "../constants";

async function main() {
  const debug = false;
  //const debug = true;

  const safeAddress = "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88";
  //const safeAddress = "0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157";


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

  const steadyBeets2 = "0xecaa1cbd28459d34b766f9195413cb20122fb942000200000000000000000120";
  const steadyBeetsBPT = new ethers.Contract(addresses.steadyBeets2BPT, ERC20, owner1);
  const dai = new ethers.Contract(addresses.dai, ERC20);
  const masterchef = new ethers.Contract(addresses.beetsMasterChef, BeetsMasterChef);

  const amountsIn = [0, ethers.constants.WeiPerEther];
  const depositAmount = await steadyBeetsBPT.balanceOf(safeAddress);
  let datas = [
    steadyBeetsBPT.interface.encodeFunctionData("approve", [addresses.beetsMasterChef, depositAmount]),
    masterchef.interface.encodeFunctionData("deposit", [33, depositAmount, safeAddress]),
  ]
  let targets = [addresses.steadyBeets2BPT, addresses.beetsMasterChef]

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
    const transactions: MetaTransactionData[] = [
      {
        to: addresses.steadyBeets2BPT,
        data: datas[0],
        value: "0",
        operation: 0,
      },
      {
        to: addresses.beetsMasterChef,
        data: datas[1],
        value: "0",
        operation: 0,
      }
    ]
    const options: SafeTransactionOptionalProps = {
      safeTxGas: 2*1e6,
    }

    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: owner1
    })

    const contractNetworks: ContractNetworksConfig = {
      [await owner1.getChainId()]: {
        multiSendAddress: '0xd1b160Ee570632ac402Efb230d720669604918e8',
        safeMasterCopyAddress: '0x87EB227FE974e9E1d3Bc4Da562e0Bd3C348c2B34',
        safeProxyFactoryAddress: '0xc3C41Ab65Dabe3ae250A0A1FE4706FdB7ECEB951'
      }
    }
    const service = new SafeService("https://safe.fantom.network")

    const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapterOwner1, safeAddress, contractNetworks})
    console.log(safeSdk.getAddress());

    const safeTx = await safeSdk.createTransaction(transactions, options)
    const safeTxHash = await safeSdk.getTransactionHash(safeTx);

    const signature = await safeSdk.signTransactionHash(safeTxHash);
    await service.proposeTx(safeAddress, safeTxHash, safeTx, signature);
  }
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })


