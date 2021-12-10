require("@nomiclabs/hardhat-waffle");
const fs = require('fs')

module.exports = {
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
      blockGasLimit: 4e9,
      gas: 3e9,
    },
  }
};
