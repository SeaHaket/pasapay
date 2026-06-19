import { createPublicClient, createWalletClient, http, parseEventLogs } from "viem";
import { celo, celoSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const ODIS_KEY = process.env.ODIS_SIGNER_PRIVATE_KEY;
const METADATA_URI = "https://pasapay.vercel.app/agent-metadata.json";

// Registry contract addresses
const IDENTITY_REGISTRY_MAINNET = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const IDENTITY_REGISTRY_SEPOLIA = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

const IDENTITY_REGISTRY_ABI = [
  {
    inputs: [
      { internalType: "string", name: "agentURI", type: "string" }
    ],
    name: "register",
    outputs: [
      { internalType: "uint256", name: "", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// Standard ERC-721 Transfer Event ABI to parse minted tokenId
const TRANSFER_EVENT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "from", type: "address" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }
    ],
    name: "Transfer",
    type: "event"
  }
] as const;

async function register() {
  const isSepolia = process.argv.includes("--sepolia");
  const chain = isSepolia ? celoSepolia : celo;
  const rpcUrl = isSepolia
    ? "https://forno.celo-sepolia.celo-testnet.org"
    : "https://forno.celo.org";
  const registryAddress = isSepolia ? IDENTITY_REGISTRY_SEPOLIA : IDENTITY_REGISTRY_MAINNET;

  console.log(`\nNetwork: Celo ${isSepolia ? "Sepolia Testnet" : "Mainnet"}`);
  console.log(`Registry: ${registryAddress}`);
  console.log(`RPC: ${rpcUrl}`);

  if (!ODIS_KEY) {
    console.error("Error: ODIS_SIGNER_PRIVATE_KEY not found in .env.local!");
    process.exit(1);
  }

  const cleanKey = ODIS_KEY.startsWith("0x") ? ODIS_KEY : `0x${ODIS_KEY}`;
  const account = privateKeyToAccount(cleanKey as `0x${string}`);
  console.log(`Signer Owner Address: ${account.address}`);

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

  console.log("\nSending registration transaction...");

  try {
    const hash = await walletClient.writeContract({
      address: registryAddress as `0x${string}`,
      abi: IDENTITY_REGISTRY_ABI,
      functionName: "register",
      args: [METADATA_URI],
    });

    console.log(`Transaction submitted! Hash: ${hash}`);
    console.log("Waiting for confirmation (this takes about 5 seconds)...");

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed on-chain!");

    // Parse the ERC-721 Transfer event logs to find the tokenId (agentId)
    const logs = parseEventLogs({
      abi: TRANSFER_EVENT_ABI,
      eventName: "Transfer",
      logs: receipt.logs,
    });

    if (logs.length > 0) {
      const mintedAgentId = logs[0].args.tokenId.toString();
      console.log(`\n==========================================`);
      console.log(`🎉 SUCCESS! Pasa Agent Registered!`);
      console.log(`Agent ID (Token ID): ${mintedAgentId}`);
      console.log(`Owner: ${logs[0].args.to}`);
      console.log(`Metadata URI: ${METADATA_URI}`);
      console.log(`==========================================\n`);
      console.log(`Next step: Update AGENT_ID_MAINNET or AGENT_ID_SEPOLIA in 'config/agent.ts' to be ${mintedAgentId}.`);
    } else {
      console.warn("Could not find Transfer event in transaction receipt logs. Please check the transaction manually.");
    }
  } catch (err: any) {
    console.error("Registration failed:", err?.message || err);
    process.exit(1);
  }
}

register();
