const { ethers } = require("hardhat");
const fs = require('fs')
const { addresses, contracts } = require("./constants.js");
const erc20ABI = fs.readFileSync('./abi/ERC20.json', 'utf8')
const factoryABI = fs.readFileSync('./abi/UniswapV2Factory.json', 'utf8')
const { bootstrapBonds, bootstrap, deployContracts, deployBonds } = require('../utils/deploy.js');

async function main() {
    const [deployer] = await ethers.getSigners();
    const largeApproval = '100000000000000000000000000000000';
    console.log("deploying with address ", deployer.address);

    const eth = ethers.BigNumber.from(10).pow(18);
    const gwei = ethers.BigNumber.from(10).pow(9);
    const zeroAddress = '0x0000000000000000000000000000000000000000';

    const DAI = await ethers.getContractFactory('DAI');
    const factoryAddress = '0xEF45d134b73241eDa7703fa787148D9C9F4950b0'; // SpiritSwap
    const daoAddress = '0x82BAB147F3F8afbA380eDBE1792a7a71e2c9cb88';
    const team = '0xcC9D3B0C4623A9846DDb1fb40D729e771A22a157';
    const MIMAddress = '0x82f0b8b456c1a451378467398982d4834b6829c1';
    const accountToInpersonate = addresses.multisig
    //const accountToInpersonate = addresses.timelock;
    //const accountToInpersonate = "0x433596383A281E5417da4C3C393c2d8c693c4d4b";
    const scrDaiLPAddress = "0x468c174cc015d4a697586C0a99F95E045F7e6f91";
    const staking = (await ethers.getContractFactory("SecureStaking")).attach(addresses.staking);
    const scr = (await ethers.getContractFactory("SecureERC20Token")).attach(addresses.scr);
    const treasury = (await ethers.getContractFactory("SecureTreasury")).attach(addresses.treasury);


    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToInpersonate],
    });
    const signer = await ethers.getSigner(accountToInpersonate)

    await deployer.sendTransaction({
      to: signer.address,
      value: ethers.utils.parseEther("1000.0")
    }).then(tx=>tx.wait());
    walletAddr = "0x2be31129ad6d9Cf800f105E7dF1AdE334BAfFCd2";
    await deployer.sendTransaction({
      to: walletAddr,
      value: ethers.utils.parseEther("1000.0")
    }).then(tx=>tx.wait());
    await treasury.connect(signer).queue(0, signer.address);
    await treasury.connect(signer).toggle(0, signer.address, zeroAddress);
    await treasury.connect(signer).manage(MIMAddress, eth.mul(100)).then(tx=>tx.wait())

    await DAI.attach(MIMAddress).connect(signer).approve(treasury.address, eth.mul(10000)).then(tx=>tx.wait())
    await treasury.connect(signer).deposit(eth.mul(50), MIMAddress, 0).then(tx=>tx.wait())
    const Router = await ethers.getContractFactory('Router', deployer);
    const routerAddr = "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52";
    const router = Router.attach(routerAddr);
    await DAI.attach(MIMAddress).connect(signer).approve(router.address, largeApproval).then(tx=>tx.wait())
    await scr.connect(signer).approve(router.address, largeApproval).then(tx=>tx.wait())
    await router.connect(signer).addLiquidity(
      MIMAddress,
      scr.address,
      eth.mul(50),
      gwei.mul(50),
      0,
      0,
      walletAddr,
      eth
    ).then(tx=>tx.wait())
}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})



