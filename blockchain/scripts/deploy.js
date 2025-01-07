const fs = require("fs");
const hre = require('hardhat');
const { ethers, run } = require('hardhat');

const COORDINATOR = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
const KEY_HASH = "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71";
const SUBSCRIPTION_ID = "39463918527579382126369116749837775543133265164552717161130630191887620833244";
const FEE_WALLET = "0xad362783a729E67030201C4064Ff8E2e872E4df9";
const MAX_BET = ethers.parseEther("0.01");

async function verifyContract(address, args) {
  console.log('Waiting 60 seconds before verification...');
  await new Promise(resolve => setTimeout(resolve, 60000)); // 60 second delay

  for (let i = 0; i < 3; i++) { // Try 3 times
    try {
      await run('verify:verify', {
        address: address,
        constructorArguments: args,
      });
      console.log(`Verified contract ${address}`);
      return;
    } catch (e) {
      if (i < 2) { // Don't wait on last attempt
        console.log(`Verification attempt ${i + 1} failed. Waiting 30 seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second delay between retries
      } else {
        console.log('Final verification attempt failed:', e);
      }
    }
  }
}

async function main() {
  const CoinFlip = await ethers.getContractFactory("CoinFlip");
  const coinFlip = await CoinFlip.deploy(COORDINATOR, SUBSCRIPTION_ID, KEY_HASH, FEE_WALLET, MAX_BET);
  await coinFlip.waitForDeployment();
  const coinFlipAddress = await coinFlip.getAddress();

  console.log("\nCoinFlip deployed to: ", coinFlipAddress);

  // Wait for more confirmations
  console.log('\nWaiting for more confirmations...');
  await coinFlip.deploymentTransaction()?.wait(5);

  // Verify with retry mechanism
  await verifyContract(
    coinFlipAddress, 
    [COORDINATOR, SUBSCRIPTION_ID, KEY_HASH, FEE_WALLET, MAX_BET]
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
