import { createPublicClient, http, formatUnits } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";

// Load env variables
dotenv.config({ path: ".env.local" });

const ODIS_KEY = process.env.ODIS_SIGNER_PRIVATE_KEY;

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
    stateMutability: "view",
  },
] as const;

const MAINNET_TOKENS = {
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
  USDm: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
};

const SEPOLIA_TOKENS = {
  USDT: "0xd077A400968890Eacc75cdc901F0356c943e4fDb",
  USDC: "0x01C5C0122039549AD1493B8220cABEdD739BC44E",
  USDm: "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80",
};

async function check() {
  if (!ODIS_KEY) {
    console.error("No ODIS_SIGNER_PRIVATE_KEY found in .env.local!");
    return;
  }

  const cleanKey = ODIS_KEY.startsWith("0x") ? ODIS_KEY : `0x${ODIS_KEY}`;
  const account = privateKeyToAccount(cleanKey as `0x${string}`);
  console.log(`\n==========================================`);
  console.log(`Signer Address: ${account.address}`);
  console.log(`==========================================\n`);

  // Mainnet check
  const mainClient = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });
  console.log(`--- Checking Celo Mainnet ---`);
  try {
    const celoBal = await mainClient.getBalance({ address: account.address });
    console.log(`CELO: ${formatUnits(celoBal, 18)}`);

    const usdtBal = await mainClient.readContract({
      address: MAINNET_TOKENS.USDT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`USDT: ${formatUnits(usdtBal, 6)}`);

    const usdcBal = await mainClient.readContract({
      address: MAINNET_TOKENS.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`USDC: ${formatUnits(usdcBal, 6)}`);

    const usdmBal = await mainClient.readContract({
      address: MAINNET_TOKENS.USDm as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`USDm: ${formatUnits(usdmBal, 18)}`);
  } catch (err: any) {
    console.error(`Mainnet Check Error:`, err?.message || err);
  }

  // Sepolia check
  console.log(`\n--- Checking Celo Sepolia ---`);
  const sepoliaClient = createPublicClient({ chain: celoSepolia, transport: http("https://sepolia-forno.celo-testnet.org") });
  try {
    const celoBal = await sepoliaClient.getBalance({ address: account.address });
    console.log(`CELO: ${formatUnits(celoBal, 18)}`);

    const usdtBal = await sepoliaClient.readContract({
      address: SEPOLIA_TOKENS.USDT as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`USDT: ${formatUnits(usdtBal, 6)}`);

    const usdcBal = await sepoliaClient.readContract({
      address: SEPOLIA_TOKENS.USDC as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`USDC: ${formatUnits(usdcBal, 6)}`);

    const usdmBal = await sepoliaClient.readContract({
      address: SEPOLIA_TOKENS.USDm as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`USDm: ${formatUnits(usdmBal, 18)}`);
  } catch (err: any) {
    console.error(`Sepolia Check Error:`, err?.message || err);
  }
}

check();
