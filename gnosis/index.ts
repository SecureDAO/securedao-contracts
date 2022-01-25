import { ethers } from "hardhat";
import Safe from '@gnosis.pm/safe-core-sdk';
import { MetaTransactionData, SafeTransactionDataPartial } from '@gnosis.pm/safe-core-sdk-types';
import { SafeTransactionOptionalProps, ContractNetworksConfig, EthersAdapter, SafeFactory, SafeAccountConfig } from '@gnosis.pm/safe-core-sdk';
import { SafeEthersSigner, SafeService } from '@gnosis.pm/safe-ethers-adapters';

export class GnosisMultiSend {
  signer:ethers.api.Signer;
  safeAddress:string;

  constructor(safeAddress:string, signer:ethers.api.Signer) {
    this.signer = signer;
    this.safeAddress = safeAddress;
  }

  public static prepareMetaTransactions(datas:any[], targets:string[]) : MetaTransactionData[]{
    let transactions: MetaTransactionData[];
    for (let i = 0; i < datas.length; i++) {
      transactions.push({
        to: targets[i],
        data: datas[i],
        value: "0",
        operation: 0,
      })
    }

    return transactions;
  }

  async contractNetworks(signer: ethers.api.Signer) : Promise<ContractNetworksConfig> {
    const contractNetworks: ContractNetworksConfig = {
      [await signer.getChainId()]: {
        multiSendAddress: '0xd1b160Ee570632ac402Efb230d720669604918e8',
        safeMasterCopyAddress: '0x87EB227FE974e9E1d3Bc4Da562e0Bd3C348c2B34',
        safeProxyFactoryAddress: '0xc3C41Ab65Dabe3ae250A0A1FE4706FdB7ECEB951'
      }
    }

    return contractNetworks;
  }

  async send(transactions:MetaTransactionData[], options:SafeTransactionOptionalProps) {

    const ethAdapterOwner1 = new EthersAdapter({
      ethers,
      signer: this.signer
    })

    const service = new SafeService("https://safe.fantom.network")

    const safeSdk: Safe = await Safe.create({ ethAdapter: ethAdapterOwner1, safeAddress: this.safeAddress, contractNetworks: await this.contractNetworks(this.signer)})
    console.log(safeSdk.getAddress());

    const safeTx = await safeSdk.createTransaction(transactions, options)
    const safeTxHash = await safeSdk.getTransactionHash(safeTx);

    const signature = await safeSdk.signTransactionHash(safeTxHash);
    await service.proposeTx(this.safeAddress, safeTxHash, safeTx, signature);
  }
}
