import hre from "hardhat";

async function main() {
  console.log("Deploying PasaPayBatchRouter contract to Celo...");

  const PasaPayBatchRouter = await hre.ethers.getContractFactory("PasaPayBatchRouter");
  const batchRouter = await PasaPayBatchRouter.deploy();

  await batchRouter.waitForDeployment();

  const deployedAddress = await batchRouter.getAddress();
  console.log("------------------------------------------------");
  console.log(`PasaPayBatchRouter deployed to: ${deployedAddress}`);
  console.log("------------------------------------------------");
  console.log("Copy this address and add it to your .env.local file:");
  console.log(`NEXT_PUBLIC_PASAPAY_BATCH_ROUTER_ADDRESS=${deployedAddress}`);
  console.log("------------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
