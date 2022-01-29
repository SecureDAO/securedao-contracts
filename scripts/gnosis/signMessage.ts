import { SafeEthersSigner, SafeService } from '@gnosis.pm/safe-ethers-adapters';
import Safe from '@gnosis.pm/safe-core-sdk';
import { _TypedDataEncoder } from '@ethersproject/hash';
import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { BalancerHelpers, BalancerVault, ERC20, UniswapV2Router02, GnosisSafe } from "../../abi";
import { SafeTransactionOptionalProps, ContractNetworksConfig, EthersAdapter, SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';
import { addresses, contracts } from "../constants";
import {GnosisMultiSend} from "../../gnosis";
import { WeightedPoolEncoder } from "@balancer-labs/balancer-js";
import snapshot from '@snapshot-labs/snapshot.js';
const Web3HttpProvider = require('web3-providers-http');
async function main() {
  //const debug = false;
  const debug = true;
  const hub = 'https://hub.snapshot.org'; // or https://testnet.snapshot.org for testnet
  const client = new snapshot.Client712(hub);
  const safeAddress = "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88";

  let owner1;
  let multisig;
  let hash;
  console.log(ethers.utils.hexConcat(["0x01", addresses.multisig,addresses.multisig]))
  //  console.log("debug mode");
    const [deployer] = await ethers.getSigners();

  //  owner1 = deployer;
  //  const provider = new Web3HttpProvider('http://localhost:8686');
  //const receipt = await client.vote(new ethers.providers.Web3Provider(provider), safeAddress, {
  //  space: 'beets.eth',
  //  proposal: '0x8f28b88f32c80b3212afb0e850c6230023284fa33ccc2c14690c20195a086cb7',
  //  type: 'weighted-voting',
  //  choice: 1,
  //  metadata: JSON.stringify({})
  //});
  //this.broadcast(web3, address, space, 'vote', {
  //  proposal,
  //  choice,
  //  metadata
  //});

  const choice = 1
  const proposal = '0x8f28b88f32c80b3212afb0e850c6230023284fa33ccc2c14690c20195a086cb7'
  const metadata = {}
  const payload = { proposal, choice, metadata }
  const data = {
      //version: "0.1.4",
      timestamp: 1644111688,
      space: "beets.eth",
      type: "weighted-voting",
      from: safeAddress,
      metadata: "",
      choice,
      proposal,
    }
  const msg: any = {
    address: safeAddress,
    msg: JSON.stringify(data),

  };
  console.log("foo")
  //msg.sig = await owner1.signMessage(msg.msg)
  let domain = { name: 'snapshot', version: '0.1.4' };
  let types = {
    Vote: [
      { name: 'from', type: 'address' },
      { name: 'space', type: 'string' },
      { name: 'timestamp', type: 'uint64' },
      { name: 'proposal', type: 'string' },
      { name: 'choice', type: 'uint32' },
      { name: 'metadata', type: 'string' }
    ]
  };
  console.log("foo")
  hash = _TypedDataEncoder.hash(domain, types, data);
  console.log(hash);
  console.log("foo")
  let sig = await deployer._signTypedData(domain,types,data);
  console.log(sig);
  sig = ethers.utils.hexConcat([sig,sig])
  console.log(ethers.utils.verifyTypedData(domain, types, data, sig))
  //console.log("receipt")
  //console.log(receipt)



  //let multi = new GnosisMultiSend(safeAddress, owner1);
  let gnosisSafe = new ethers.Contract(addresses.multisig, GnosisSafe, owner1);
  //let message = ethers.utils.toUtf8Bytes("Hello world");

  //const ethAdapterOwner1 = new EthersAdapter({
  //  ethers,
  //  signer: owner1
  //})
  //const service = new SafeService("https://safe.fantom.network")

  //const contractNetworks: ContractNetworksConfig = {
  //  [await owner1.getChainId()]: {
  //    multiSendAddress: '0xd1b160Ee570632ac402Efb230d720669604918e8',
  //    safeMasterCopyAddress: '0x87EB227FE974e9E1d3Bc4Da562e0Bd3C348c2B34',
  //    safeProxyFactoryAddress: '0xc3C41Ab65Dabe3ae250A0A1FE4706FdB7ECEB951'
  //  }
  //}
  //const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapterOwner1, safeAddress, contractNetworks})
  ////let signed = await owner1.signMessage(message);
  //let datas = [
  //  gnosisSafe.interface.encodeFunctionData(
  //    "signMessage",
  //    [hash]
  //  )
  //]
  //let targets = [addresses.multisig]

  //if (debug) {
  //  const accountToInpersonate = addresses.multisig
  //  await hre.network.provider.request({
  //    method: "hardhat_impersonateAccount",
  //    params: [accountToInpersonate],
  //  });
  //  multisig = await ethers.getSigner(accountToInpersonate)

  //  await owner1.sendTransaction({
  //    to: multisig.address,
  //    value: ethers.utils.parseEther("1000.0")
  //  }).then(tx=>tx.wait());

  //  for (let i = 0; i < datas.length; i++) {
  //    await multisig.sendTransaction({
  //      to: targets[i],
  //      value: 0,
  //      data: datas[i],
  //    }).then(tx=>tx.wait());
  //  }

  //  let msgHash = await gnosisSafe.getMessageHash(hash);
  //  console.log(msgHash)
  //  console.log(await gnosisSafe.signedMessages(msgHash))
  //  console.log(await gnosisSafe.callStatic.isValidSignature(hash, []))
  //} else {
  //  let tx = GnosisMultiSend.prepareMetaTransactions(datas, targets);
  //  await multi.send(tx);
  //}
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })




