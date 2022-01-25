import hre from "hardhat";
import { ethers } from "hardhat";
import { addresses, contracts } from "./constants";
const BigNumber = ethers.BigNumber;
import * as fs from "fs";
const gnosisSafeABI = fs.readFileSync('./abi/GnosisSafe.json', 'utf8')

async function main() {
  const ether = BigNumber.from('10').pow(18);
  const gwei = BigNumber.from('10').pow(9);
  const accountToInpersonate = addresses.multisig
  //const accountToInpersonate = addresses.timelock;
  const [deployer] = await ethers.getSigners();

  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [accountToInpersonate],
  });
  const signer = await ethers.getSigner(accountToInpersonate)

  await deployer.sendTransaction({
    to: signer.address,
    value: ethers.utils.parseEther("1000.0")
  }).then(tx=>tx.wait());

  let treasury = (await ethers.getContractFactory(contracts[addresses.treasury])).attach(addresses.treasury);
  const daiAddress = "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E";
  await treasury.connect(signer).manage(daiAddress, ethers.utils.parseEther("25000.0"));
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})





