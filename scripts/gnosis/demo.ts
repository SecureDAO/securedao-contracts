import { ethers } from "hardhat";
import Safe from '@gnosis.pm/safe-core-sdk';
import { MetaTransactionData, SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import { SafeTransactionOptionalProps, ContractNetworksConfig, EthersAdapter, SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';
import { SafeEthersSigner, SafeService } from '@gnosis.pm/safe-ethers-adapters';
import { ERC20 } from "../../abi";

async function main() {
  const safeAddress = "0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88";

  //let provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:1248");
  //let owner1 = provider.getSigner();
  let [owner1] = await ethers.getSigners()

  const mimAddress = "0x82f0B8B456c1A451378467398982d4834b6829c1";
  const mim = new ethers.Contract(mimAddress, ERC20);

  const transactions: MetaTransactionData[] = [
  {
    to: owner1.address,
    data: '0x00',
    value: '1000000000000000000',
  }
  ]
  const options: SafeTransactionOptionalProps = {
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
  //await service.proposeTx(safeAddress, safeTxHash, safeTx, signature);
}

main()
  .then(() => process.exit())
  .catch(error => {
    console.error(error);
    process.exit(1);
  })



