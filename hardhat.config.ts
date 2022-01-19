import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { HardhatUserConfig } from "hardhat/config";
import { readFileSync } from 'fs';

import secrets from './secrets.json';
let pk = "";
if (secrets.pk_path) {
  pk = readFileSync(secrets.pk_path, 'utf8').trim()
}

const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.1",
      },
      {
        version: "0.5.16",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 999999,
          },
          outputSelection: {
            "*": {
              "": [
                "ast"
              ],
              "*": [
                "evm.bytecode.object",
                "evm.deployedBytecode.object",
                "abi",
                "evm.bytecode.sourceMap",
                "evm.deployedBytecode.sourceMap",
                "metadata"
              ]
            },
          },
        },
      },
      {
        version: "0.6.6",
        settings: {
          evmVersion: "istanbul",
          optimizer: {
            enabled: true,
            runs: 999999,
          },
          outputSelection: {
            "*": {
              "": [
                "ast"
              ],
              "*": [
                "evm.bytecode.object",
                "evm.deployedBytecode.object",
                "abi",
                "evm.bytecode.sourceMap",
                "evm.deployedBytecode.sourceMap",
                "metadata"
              ]
            },
          },
        },
      },
      {
        version: "0.7.5",
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      blockGasLimit: 40000000000,
      gas: 30000000000,
    },
    localhost: {
      url: "http://localhost:8686/",
      blockGasLimit: 4e9,
      gas: 3e9,
    },
    fantom_mainnet: {
      url: "https://rpc.ftm.tools",
      chainId: 250,
      accounts: [`${pk.replace(new RegExp("^" + "0x"), '')}`]
    },
    fantom_testnet: {
      url: "https://rpc.testnet.fantom.network",
      chainId: 4002,
      accounts: [`${pk.replace(new RegExp("^" + "0x"), '')}`]
    },
  },
  etherscan: {
    apiKey: secrets.etherscanAPIKey,
  },
};

export default config;
