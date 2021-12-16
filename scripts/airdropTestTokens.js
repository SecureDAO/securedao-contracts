const { ethers } = require("hardhat");
const BigNumber = ethers.BigNumber;
const fs = require('fs')

async function main() {
  const ether = BigNumber.from('10').pow(18);
  const gwei = BigNumber.from('10').pow(9);

  const [deployer] = await ethers.getSigners();
  let testers = [
  ]

  const treasuryAddr = '0x90322bb688Df3ccF9Fcb9CED1b564aAa44bE1450';
  const daiAddr = '0x4AE078B73Dd12e1ADA12b55a970B40fBbAc20e3A';
  const Treasury = await ethers.getContractFactory('SecureTreasury');
  const treasury = await Treasury.attach(treasuryAddr);

  console.log("reserve token");
  const reserveToken = await treasury.reserveTokens(0);
  console.log("lp token");
  //const lpToken = await treasury.liquidityTokens(0);
  console.log("scr token");
  //const scrAddress = await treasury.SCR();

  const DAI = await ethers.getContractFactory('DAI');
  const dai = await DAI.attach(daiAddr);

  //await dai.mint(deployer.address, ethers.utils.parseEther(1e6));
  //const SCR = await ethers.getContractFactory('SecureERC20Token');
  //const scr = await SCR.attach(scrAddress);

  //const lp = await DAI.attach(lpToken);

  console.log("mim ", dai.address);
  //console.log("scr ", scr.address);
  //console.log("mim-scr lp ", lpToken);

  await dai.balanceOf(deployer.address).then(bal => console.log("mim bal ", bal.toString()));
  //await scr.balanceOf(deployer.address).then(bal => console.log("scr bal ", bal.toString()));
  //await lp.balanceOf(deployer.address).then(bal => console.log("lp bal ", bal.toString()));

  for (let i = 0; i < testers.length; i++) {
    console.log("airdropping ", testers[i]);
    await dai.transfer(testers[i], BigNumber.from('10000').mul(ether)).then(tx => tx.wait());
    //await scr.transfer(testers[i], BigNumber.from('10').mul(gwei)).then(tx => tx.wait());
    //await lp.transfer(testers[i], BigNumber.from('1').mul(gwei)).then(tx => tx.wait());
  }
  //const DAI = await ethers.getContractFactory('DAI');
  //const dai = await DAI.attach('0xeadf53cC0cAD430c8543697B8e33E8940961f4Da');

  //const SCR = await ethers.getContractFactory('SecureERC20Token');
  //const src = await SCR.attach('0xBfcb1b1Fd1b679292B7f0024d8BCBc1b6AD74934');

}

main()
    .then(() => process.exit())
    .catch(error => {
        console.error(error);
        process.exit(1);
})



