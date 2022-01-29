import hre from "hardhat";
import { WeightedPoolEncoder } from "@balancer-labs/balancer-js";
import { ethers } from "hardhat";
import Safe from '@gnosis.pm/safe-core-sdk';
import { MetaTransactionData, SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import { SafeTransactionOptionalProps, ContractNetworksConfig, EthersAdapter, SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';
import { SafeEthersSigner, SafeService } from '@gnosis.pm/safe-ethers-adapters';
import { BalancerVault, ERC20 } from "../../abi";
import { addresses, contracts } from "../constants";

async function main() {
  const debug = true;
  //const debug = true;

  const safeAddress = "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88";
  //const safeAddress = "0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157";

  let owner1;
  if (debug) {
    console.log("debug mode active");
    [owner1] = await ethers.getSigners();
  } else {
    console.log("running live");
    let provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:1248");
    owner1 = provider.getSigner();
  }

  const steadyBeets2 = "0xecaa1cbd28459d34b766f9195413cb20122fb942000200000000000000000120";
  const daiAddress = "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E";
  const dai = new ethers.Contract(daiAddress, ERC20);
  const beetsVault = "0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce";
  const treasury = await ethers.getContractFactory(contracts[addresses.treasury]);
  const vault = new ethers.Contract(beetsVault, BalancerVault);

  const amountsIn = [ethers.constants.WeiPerEther, 0];
console.log(WeightedPoolEncoder.joinExactTokensInForBPTOut(amountsIn, 0));
  //const transactions: MetaTransactionData[] = [
  //  {
  //    to: addresses.treasury,
  //    data: treasury.interface.encodeFunctionData("manage", [daiAddress, ethers.utils.parseEther("25000.0")]),
  //    value: "0",
  //    operation: 0,
  //  },
  //  {
  //    to: daiAddress,
  //    data: dai.interface.encodeFunctionData("approve", [beetsVault, ethers.utils.parseEther("25000.0")]),
  //    value: "0",
  //    operation: 0,
  //  },
  //  {
  //    to: beetsVault,
  //    data: vault.interface.encodeFunctionData(
  //      "joinPool",
  //      [
  //        steadyBeets2,
  //        safeAddress,
  //        safeAddress,
  //        {
  //          assets: [
  //            "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
  //            daiAddress,
  //          ],
  //          maxAmountsIn: [0, ethers.constants.WeiPerEther],
  //          userData: WeightedPoolEncoder.joinExactTokensInForBPTOut(amountsIn, 0),
  //          fromInternalBalance: false,
  //        }
  //      ]
  //    ),
  //    value: "0",
  //    operation: 0,
  //  }
  //]
  //const options: SafeTransactionOptionalProps = {}

  //const ethAdapterOwner1 = new EthersAdapter({
  //  ethers,
  //  signer: owner1
  //})

  //const contractNetworks: ContractNetworksConfig = {
  //  [await owner1.getChainId()]: {
  //    multiSendAddress: '0xd1b160Ee570632ac402Efb230d720669604918e8',
  //    safeMasterCopyAddress: '0x87EB227FE974e9E1d3Bc4Da562e0Bd3C348c2B34',
  //    safeProxyFactoryAddress: '0xc3C41Ab65Dabe3ae250A0A1FE4706FdB7ECEB951'
  //  }
  //}
  //const service = new SafeService("https://safe.fantom.network")

  //const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapterOwner1, safeAddress, contractNetworks})
  //console.log(safeSdk.getAddress());

  //const safeTx = await safeSdk.createTransaction(transactions, options)
  //const safeTxHash = await safeSdk.getTransactionHash(safeTx);

  //if (!debug) {
  //  const signature = await safeSdk.signTransactionHash(safeTxHash);
  //  await service.proposeTx(safeAddress, safeTxHash, safeTx, signature);
  //} else {
  //  const owners = [
  //    "0x3E30bb05e183D388b573ECc6377E9F584D7cfC42",
  //    "0x44F40F73fc05dB24CB72cdE2D4149633285F6E2d",
  //    "0x6Da6Acc0abb6Fbff92b5Da43d20934fC6B4a4115",

  //  ]

  //  for (let o of owners) {
  //    console.log(o);
  //    await hre.network.provider.request({
  //      method: "hardhat_impersonateAccount",
  //      params: [o],
  //    });
  //    const signer = await ethers.getSigner(o)

  //    const ethAdapterOwner2 = new EthersAdapter({ ethers, signer: signer })
  //    const safeSdk2 = await safeSdk.connect({ ethAdapter: ethAdapterOwner2, safeAddress })
  //    //await safeSdk2.signTransaction(safeTx);
  //    const txHash = await safeSdk2.getTransactionHash(safeTx)
  //    console.log(txHash);
  //    const approveTxResponse = await safeSdk2.approveTransactionHash(txHash)
  //    await approveTxResponse.transactionResponse?.wait()
  //  }

  //  const executeTxResponse = await safeSdk.executeTransaction(safeTx)
  //  await executeTxResponse.transactionResponse?.wait()
  //}
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })

