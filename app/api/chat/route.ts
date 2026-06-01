import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import {
  USDT_ADDRESS,
  USDT_FEE_CURRENCY,
} from "@/lib/constants";
import {
  FEATHER_USDT_VAULT,
  AAVE_POOL,
  VAULT_TOKENS,
  getLiveAPYs,
} from "@/lib/vault";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `You are the PasaPay AI Co-pilot, a friendly and knowledgeable assistant specialized in Celo stablecoin payments, savings vaults, and yields.

Your capabilities include:
1. Explaining and recommending savings vault strategies (Aave V3 vs Morpho Blue/Feather).
2. Answering general questions about Celo, payments, and DeFi.
3. Drafting stablecoin transfers to other Celo addresses.
4. Drafting deposits/withdrawals for Aave V3 and Morpho Blue savings vaults.
5. Resolving phone numbers to Celo addresses (using ODIS).

Strict rules you must follow:
- Only support stablecoins: USDT, USDC, and USDm (Mento Dollar).
- NEVER display, discuss, require, or recommend the native CELO token. MiniPay hides CELO from users and manages gas via stablecoin fee abstraction.
- When explaining savings options:
  * Aave V3 has deep liquidity and safety, currently offering 4.50% APY.
  * Morpho Blue (Feather USDT Vault) has isolated peer-to-peer yields, currently offering 4.73% APY.
  * Use the get_vault_apys tool to check live yields if asked.
- When a user asks to send funds to a phone number (e.g., "+639171234567"), you MUST first resolve it to a Celo address using resolve_phone_number.
- When drafting transactions (transfers, deposits, withdrawals):
  * Use the appropriate draft tool to get the EVM transaction payload.
  * If the tool returns a "txs" array, you MUST append a structured payload at the very end of your final response in this exact format:
    [TX_DATA]<JSON_STRING>[/TX_DATA]
    Where <JSON_STRING> is the exact, valid JSON array of transactions returned by the tool. Do not include markdown code block formatting (such as \`\`\`json) inside the [TX_DATA] tags; just output the raw JSON string on a single line.
  * Always explain to the user in a friendly way what transaction you have drafted and prompt them to confirm it.
`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      tools: [
        {
          functionDeclarations: [
            {
              name: "get_vault_apys",
              description: "Gets the live APYs for Savings Providers (Aave V3 and Morpho Feather) on Celo.",
            },
            {
              name: "resolve_phone_number",
              description: "Resolves a phone number in E.164 format (e.g. +639171234567) to a Celo address using ODIS.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  phone: {
                    type: SchemaType.STRING,
                    description: "The phone number to resolve in E.164 format (e.g. +639171234567)"
                  }
                },
                required: ["phone"]
              }
            },
            {
              name: "draft_transfer",
              description: "Drafts a stablecoin transfer to a recipient address.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  to: {
                    type: SchemaType.STRING,
                    description: "The destination Celo address (0x...) of the recipient."
                  },
                  amount: {
                    type: SchemaType.STRING,
                    description: "The amount of stablecoin to transfer (e.g. '10.5')."
                  },
                  symbol: {
                    type: SchemaType.STRING,
                    description: "The stablecoin symbol: 'USDT', 'USDC', or 'USDm'. Default is 'USDT'."
                  }
                },
                required: ["to", "amount"]
              }
            },
            {
              name: "draft_deposit",
              description: "Drafts a deposit into a Savings Provider (Aave V3 or Morpho Blue). Only USDT is supported.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  protocol: {
                    type: SchemaType.STRING,
                    description: "The savings provider to deposit to: 'aave' or 'morpho'."
                  },
                  amount: {
                    type: SchemaType.STRING,
                    description: "The amount of USDT to deposit (e.g. '5.0')."
                  }
                },
                required: ["protocol", "amount"]
              }
            },
            {
              name: "draft_withdraw",
              description: "Drafts a withdrawal from a Savings Provider (Aave V3 or Morpho Blue). Only USDT is supported.",
              parameters: {
                type: SchemaType.OBJECT,
                properties: {
                  protocol: {
                    type: SchemaType.STRING,
                    description: "The savings provider to withdraw from: 'aave' or 'morpho'."
                  },
                  amount: {
                    type: SchemaType.STRING,
                    description: "The amount of USDT to withdraw (e.g. '5.0')."
                  }
                },
                required: ["protocol", "amount"]
              }
            }
          ]
        }
      ]
    });

    // Setup chat with history
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const lastMessage = messages[messages.length - 1].content;
    const chat = model.startChat({ history });

    let responseResult = await chat.sendMessage(lastMessage);
    let response = responseResult.response;
    let calls = response.functionCalls();

    // Loop to handle potential multi-turn function calls
    while (calls && calls.length > 0) {
      const callResults = [];

      for (const call of calls) {
        const { name, args } = call;
        let functionResult: any = {};

        try {
          if (name === "get_vault_apys") {
            const apys = await getLiveAPYs();
            functionResult = apys;
          } else if (name === "resolve_phone_number") {
            const { phone } = args as any;
            const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/resolve-phone`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phone }),
            });
            const rData = await res.json();
            functionResult = { address: rData.address };
          } else if (name === "draft_transfer") {
            const { to, amount, symbol } = args as any;
            const tokenSym = symbol || "USDT";
            const token = VAULT_TOKENS.find(t => t.symbol === tokenSym) || {
              address: USDT_ADDRESS,
              decimals: 6,
              feeCurrency: USDT_FEE_CURRENCY
            };

            const amountRaw = parseUnits(amount, token.decimals);
            const txData = encodeFunctionData({
              abi: erc20Abi,
              functionName: "transfer",
              args: [to as `0x${string}`, amountRaw]
            });

            functionResult = {
              txs: [{
                to: token.address,
                data: txData,
                feeCurrency: token.feeCurrency,
                label: `Transfer $${amount} ${tokenSym}`,
                value: "0"
              }]
            };
          } else if (name === "draft_deposit") {
            const { protocol, amount } = args as any;
            const amountRaw = parseUnits(amount, 6);
            const txs = [];

            if (protocol === "morpho") {
              txs.push({
                to: USDT_ADDRESS,
                data: encodeFunctionData({
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [FEATHER_USDT_VAULT, amountRaw]
                }),
                feeCurrency: USDT_FEE_CURRENCY,
                label: `Approve USDT spend for Morpho Blue`,
                value: "0"
              });

              const erc4626Abi = [
                {
                  name: "deposit",
                  type: "function",
                  stateMutability: "nonpayable",
                  inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }],
                  outputs: [{ name: "shares", type: "uint256" }],
                }
              ] as const;

              txs.push({
                to: FEATHER_USDT_VAULT,
                data: encodeFunctionData({
                  abi: erc4626Abi,
                  functionName: "deposit",
                  args: [amountRaw, "0x8888888888888888888888888888888888888888"]
                }),
                feeCurrency: USDT_FEE_CURRENCY,
                label: `Deposit $${amount} USDT into Morpho Blue`,
                value: "0"
              });
            } else {
              txs.push({
                to: USDT_ADDRESS,
                data: encodeFunctionData({
                  abi: erc20Abi,
                  functionName: "approve",
                  args: [AAVE_POOL, amountRaw]
                }),
                feeCurrency: USDT_FEE_CURRENCY,
                label: `Approve USDT spend for Aave V3`,
                value: "0"
              });

              const poolAbi = [
                {
                  name: "supply",
                  type: "function",
                  stateMutability: "nonpayable",
                  inputs: [
                    { name: "asset", type: "address" },
                    { name: "amount", type: "uint256" },
                    { name: "onBehalfOf", type: "address" },
                    { name: "referralCode", type: "uint16" },
                  ],
                  outputs: [],
                }
              ] as const;

              txs.push({
                to: AAVE_POOL,
                data: encodeFunctionData({
                  abi: poolAbi,
                  functionName: "supply",
                  args: [USDT_ADDRESS, amountRaw, "0x8888888888888888888888888888888888888888", 0]
                }),
                feeCurrency: USDT_FEE_CURRENCY,
                label: `Deposit $${amount} USDT into Aave V3`,
                value: "0"
              });
            }

            functionResult = { txs };
          } else if (name === "draft_withdraw") {
            const { protocol, amount } = args as any;
            const amountRaw = parseUnits(amount, 6);
            const txs = [];

            if (protocol === "morpho") {
              const erc4626Abi = [
                {
                  name: "withdraw",
                  type: "function",
                  stateMutability: "nonpayable",
                  inputs: [
                    { name: "assets", type: "uint256" },
                    { name: "receiver", type: "address" },
                    { name: "owner", type: "address" },
                  ],
                  outputs: [{ name: "shares", type: "uint256" }],
                }
              ] as const;

              txs.push({
                to: FEATHER_USDT_VAULT,
                data: encodeFunctionData({
                  abi: erc4626Abi,
                  functionName: "withdraw",
                  args: [amountRaw, "0x8888888888888888888888888888888888888888", "0x8888888888888888888888888888888888888888"]
                }),
                feeCurrency: USDT_FEE_CURRENCY,
                label: `Withdraw $${amount} USDT from Morpho Blue`,
                value: "0"
              });
            } else {
              const poolAbi = [
                {
                  name: "withdraw",
                  type: "function",
                  stateMutability: "nonpayable",
                  inputs: [
                    { name: "asset", type: "address" },
                    { name: "amount", type: "uint256" },
                    { name: "to", type: "address" },
                  ],
                  outputs: [{ name: "", type: "uint256" }],
                }
              ] as const;

              txs.push({
                to: AAVE_POOL,
                data: encodeFunctionData({
                  abi: poolAbi,
                  functionName: "withdraw",
                  args: [USDT_ADDRESS, amountRaw, "0x8888888888888888888888888888888888888888"]
                }),
                feeCurrency: USDT_FEE_CURRENCY,
                label: `Withdraw $${amount} USDT from Aave V3`,
                value: "0"
              });
            }

            functionResult = { txs };
          }
        } catch (err: any) {
          console.error(`Error executing function ${name}:`, err);
          functionResult = { error: err?.message || "Execution failed" };
        }

        callResults.push({
          functionResponse: {
            name,
            response: functionResult
          }
        });
      }

      const followUp = await chat.sendMessage(callResults);
      response = followUp.response;
      calls = response.functionCalls();
    }

    const finalAnswer = response.text();

    // Parse out potential structured transaction data payload
    let cleanText = finalAnswer;
    let draftedTxs: any[] | null = null;

    const txMatch = finalAnswer.match(/\[TX_DATA\]([\s\S]*?)\[\/TX_DATA\]/);
    if (txMatch) {
      try {
        draftedTxs = JSON.parse(txMatch[1].trim());
        // Clean the payload out of the user visible text
        cleanText = finalAnswer.replace(/\[TX_DATA\]([\s\S]*?)\[\/TX_DATA\]/, "").trim();
      } catch (err) {
        console.error("Failed to parse drafted transaction JSON:", err);
      }
    }

    return NextResponse.json({
      content: cleanText,
      txs: draftedTxs
    });
  } catch (err: any) {
    console.error("[chat-api] error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
