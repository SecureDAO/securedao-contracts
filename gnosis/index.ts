import { ethers } from "hardhat";
import { Signer } from "ethers";
import Safe from '@gnosis.pm/safe-core-sdk';
import { MetaTransactionData } from '@gnosis.pm/safe-core-sdk-types';
import { EthersAdapter as EthAdapt, ContractNetworksConfig } from '@gnosis.pm/safe-core-sdk';
import { SafeService } from '@gnosis.pm/safe-ethers-adapters';
import SafeServiceClient from '@gnosis.pm/safe-service-client'
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'

interface SendOpts {
  nonce?: number;
}

export class GnosisMultiSend {
  signer:Signer;
  safeAddress:string;
  service:SafeService;
  safeClient:SafeServiceClient;
  safeServiceURL:string = "https://safe.fantom.network";
  ethersAdapter:EthersAdapter;
  safeSdk:Safe;


  constructor(safeAddress:string, signer:Signer, sdk:Safe) {
    this.signer = signer;
    this.safeAddress = safeAddress;
    this.service = new SafeService(this.safeServiceURL)
    this.ethersAdapter = new EthersAdapter({
      ethers,
      signer: this.signer
    })
    this.safeClient = new SafeServiceClient({
      txServiceUrl: this.safeServiceURL,
      ethAdapter: this.ethersAdapter,
    })
    this.safeSdk = sdk;
  }

  public static async create(safeAddress:string, signer:Signer):Promise<GnosisMultiSend> {
    const ethAdapterOwner1 = new EthAdapt({
      ethers,
      signer: signer
    })

    const safeSdk = await Safe.create(
      {
        ethAdapter: ethAdapterOwner1,
        safeAddress: safeAddress,
        contractNetworks: await this.contractNetworks(signer)
      }
    )

    return new GnosisMultiSend(safeAddress, signer, safeSdk);
  }

  public static async debug(signer: Signer, datas:any[], targets:string[]) {
    for (let i = 0; i < datas.length; i++) {
      console.log(targets[i]);
      await signer.sendTransaction({
        to: targets[i],
        value: 0,
        data: datas[i],
      }).then(tx=>tx.wait());
    }
  }

  public static prepareMetaTransactions(datas:any[], targets:string[]) : MetaTransactionData[]{
    let transactions: MetaTransactionData[] = [];
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

  public static async contractNetworks(signer: Signer) : Promise<ContractNetworksConfig> {
    const contractNetworks: ContractNetworksConfig = {
      [await signer.getChainId()]: {
        multiSendAddress: '0xd1b160Ee570632ac402Efb230d720669604918e8',
        safeMasterCopyAddress: '0x87EB227FE974e9E1d3Bc4Da562e0Bd3C348c2B34',
        safeProxyFactoryAddress: '0xc3C41Ab65Dabe3ae250A0A1FE4706FdB7ECEB951'
      }
    }

    return contractNetworks;
  }

  public async nextNonce():Promise<number> {
    const pending = await this.safeClient.getPendingTransactions(this.safeAddress);
    return await this.safeSdk.getNonce() + pending.count;
  }

  public async send(transactions:MetaTransactionData[], options:SendOpts = {}) {
    console.log(this.safeSdk.getAddress());
    if (!options.nonce) {
      options.nonce = await this.nextNonce();
      console.log("nonce", options.nonce)
    }
    const safeTx = await this.safeSdk.createTransaction(transactions, options)
    const safeTxHash = await this.safeSdk.getTransactionHash(safeTx);

    const signature = await this.safeSdk.signTransactionHash(safeTxHash);
    await this.service.proposeTx(this.safeAddress, safeTxHash, safeTx, signature);
  }
}
