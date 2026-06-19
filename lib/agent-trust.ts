import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import {
  REPUTATION_REGISTRY_MAINNET,
  REPUTATION_REGISTRY_ABI,
  AGENT_ID_MAINNET,
} from "@/config/agent";
import { CELO_RPC } from "./constants";

export interface AgentReputationSummary {
  count: number;
  averageRating: number;
  uptime: number;
  successRate: number;
}

const publicClient = createPublicClient({
  chain: celo,
  transport: http(process.env.NEXT_PUBLIC_CELO_RPC || CELO_RPC),
});

/**
 * Fetch the aggregated reputation summary for our agent on Celo Mainnet
 */
export async function getAgentReputation(
  agentId: number = AGENT_ID_MAINNET
): Promise<AgentReputationSummary> {
  try {
    // 1. Get all client addresses who gave feedback
    const clients = await publicClient.readContract({
      address: REPUTATION_REGISTRY_MAINNET,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: "getClients",
      args: [BigInt(agentId)],
    }) as `0x${string}`[];

    if (!clients || clients.length === 0) {
      return {
        count: 0,
        averageRating: 5.0, // Default to 5 stars if no ratings yet
        uptime: 100.0,      // Default to 100% uptime
        successRate: 100.0, // Default to 100% success rate
      };
    }

    // 2. Fetch summaries for starred, uptime, and successRate
    const [starredResult, uptimeResult, successResult] = await Promise.all([
      publicClient.readContract({
        address: REPUTATION_REGISTRY_MAINNET,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getSummary",
        args: [BigInt(agentId), clients, "starred", ""],
      }),
      publicClient.readContract({
        address: REPUTATION_REGISTRY_MAINNET,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getSummary",
        args: [BigInt(agentId), clients, "uptime", ""],
      }),
      publicClient.readContract({
        address: REPUTATION_REGISTRY_MAINNET,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "getSummary",
        args: [BigInt(agentId), clients, "successRate", ""],
      }),
    ]) as [
      [bigint, bigint, number],
      [bigint, bigint, number],
      [bigint, bigint, number]
    ];

    const [starredCount, starredSum, starredDec] = starredResult;
    const [uptimeCount, uptimeSum, uptimeDec] = uptimeResult;
    const [successCount, successSum, successDec] = successResult;

    // Calculate averages (avoid division by zero)
    const averageRating = starredCount > 0n
      ? Number(starredSum) / Number(starredCount) / (10 ** starredDec)
      : 5.0;

    const uptime = uptimeCount > 0n
      ? Number(uptimeSum) / Number(uptimeCount) / (10 ** uptimeDec)
      : 100.0;

    const successRate = successCount > 0n
      ? Number(successSum) / Number(successCount) / (10 ** successDec)
      : 100.0;

    return {
      count: clients.length,
      averageRating: Math.min(5.0, Math.max(1.0, averageRating)),
      uptime: Math.min(100.0, Math.max(0.0, uptime)),
      successRate: Math.min(100.0, Math.max(0.0, successRate)),
    };
  } catch (err) {
    console.error("Failed to fetch agent reputation summary from blockchain:", err);
    // Graceful fallback values
    return {
      count: 0,
      averageRating: 5.0,
      uptime: 100.0,
      successRate: 100.0,
    };
  }
}
