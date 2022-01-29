import hre from "hardhat";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { addresses, contracts } from "./constants";
import { ERC20 } from "../abi";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("deploying with address ", deployer.address);

    const eth = ethers.constants.WeiPerEther;
    const zeroAddress = ethers.constants.AddressZero;

    let C = await ethers.getContractFactory("SwapAndLP");
    let poolID = "0xc4dac57a46a0a1acd0eb95eddef5257926279960000200000000000000000150";

    let buybackAddress = "0xbE1C367E4E0E2466EE39D7BBc54df93cA4d0490e";
    let buyback = C.attach(buybackAddress);

    let wftm = new ethers.Contract(addresses.wftm, ERC20, deployer);
    //let tx = await wftm.approve(buyback.address, eth.mul(1e6));
    //tx.wait();

    console.log("buyback address ", buyback.address);
    let poolAddress = await buyback.balancerPool();
    let pool = new ethers.Contract(poolAddress, ERC20, deployer);
    console.log(await pool.balanceOf(deployer.address));
    let tx = await buyback.execute(eth.mul(100), addresses.multisig);
    tx.wait();
    console.log(await pool.balanceOf(deployer.address));
    //tx = await wftm.approve(buyback.address, 0);
    //tx.wait();
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})


