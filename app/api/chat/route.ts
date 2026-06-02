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

const SYSTEM_PROMPT = `You are Pasa, the friendly and knowledgeable PasaPay AI Co-pilot assistant specialized in Celo stablecoin payments, savings vaults, and yields.

Your capabilities include:
1. Explaining and recommending savings vault strategies (Aave V3 vs Morpho Blue/Feather).
2. Answering general questions about Celo, payments, and DeFi.
3. Drafting stablecoin transfers to other Celo addresses.
4. Drafting deposits/withdrawals for Aave V3 and Morpho Blue savings vaults.
5. Resolving phone numbers to Celo addresses (using ODIS).
6. Answering questions about the user's past transaction history based on the provided data.

Strict guidelines and rules you must abide by:

1. TOKEN EFFICIENCY & CONCISENESS:
   - Keep responses extremely brief (maximum of 3 sentences) unless specifically asked for a detailed comparison.
   - Do NOT use verbose preambles or post-conversational filler (e.g., do NOT say "Certainly, I can help you with that!" or "Here is the transaction you requested."). Get straight to the point.
   - This keeps conversational token consumption low and fits perfectly on physical MiniPay mobile screens.

2. MINIPAY COMPLIANCE & VOCABULARY:
   - Strictly use official MiniPay-compliant terms in your conversations:
     * Say "Network fee" (NEVER "Gas" or "Gas fee").
     * Say "Deposit" (NEVER "Onramp" or "Buy crypto").
     * Say "Withdraw" (NEVER "Offramp" or "Sell crypto").
     * Say "Stablecoin" or "Digital dollar" (NEVER "Crypto token", "Cryptocurrency", or "Crypto").
   - NEVER display, discuss, require, or recommend the native CELO token. MiniPay hides CELO from users and manages gas via stablecoin fee abstraction. Only support standard stablecoins: USDT, USDC, and USDm (Mento Dollar).

3. CONTEXTUAL ACTION TRIGGERS & PROACTIVE DRAFTING:
   - If the user expresses a natural intent to send or save (e.g., "send 5 USDT to +639171234567" or "put 10 usdt in morpho"), immediately invoke the appropriate tool (e.g. resolve_phone_number, draft_transfer, draft_deposit) and output the structured transaction payload on the same turn. Do not ask for confirmation before drafting.
   - When drafting, you MUST append the structured payload at the very end of your final response in this exact format:
     [TX_DATA]<JSON_STRING>[/TX_DATA]
     Where <JSON_STRING> is the exact, valid JSON array of transactions returned by the tool. Do not include markdown code block formatting (such as \`\`\`json) inside the [TX_DATA] tags; just output the raw JSON string on a single line.

4. DEFI APY INTEGRITY (NO YIELD HALLUCINATIONS):
   - Never guess, estimate, or hallucinate vault APYs.
   - Morpho Blue (Feather USDT Vault) is currently offering 4.73% APY (isolated yield).
   - Aave V3 is currently offering 4.50% APY (deep liquidity).
   - Use the get_vault_apys tool to check live yields if asked. If the tool is not executed or fails, strictly state they are estimates.

 5. TRANSACTION HISTORY LOOKUPS:
    - When asked about past spending, transaction status, or totals, inspect the "User's Recent Transaction History" block provided in your context. Name the exact date, amount, or recipient from that log.

 6. WALLET BALANCE & QUICK SEND ENQUIRIES:
    - When asked "what is my balance?", "how much do I have?", "what is my total portfolio?", "show my vault savings", or similar, inspect the "User's Stablecoin Balances in PasaPay" block AND the "User's Deposited Vault Balances (Earnings)" block in your context.
    - Sum them up to give a complete yield portfolio summary (e.g., "$10.50 USDT in your wallet + $20.00 USDT earning yield in vaults = $30.50 USDT total assets"). Clearly separate what is in their wallet (spendable) versus what is in Aave V3 or Morpho Blue (earning yield). Keep responses brief and compliant with MiniPay compliance rules.
    - If asked about "quick send details", "quick send", or "who can I send to quickly?", refer to the "User's Quick Send Details (Top Contacts)" block in your context. List their top quick contacts with their names, routes, and countries, and ask if they'd like to draft a transfer to any of them.
    - When the user asks to send quickly, offramp, withdraw, or cash out, recommend the best option matching their context:
      * For the Philippines (PH/PHP): Explicitly state that Fonbnk is their primary and highly preferred offramp route, allowing direct cash-outs to Philippine banks (like GCash, Maya, BDO, UnionBank, etc.). Generate a direct Fonbnk link using: https://pay.fonbnk.com/offramp?walletAddress=<USER_WALLET_ADDRESS>&network=celo&currency=PHP (replace <USER_WALLET_ADDRESS> with the user's wallet address from "User's Wallet Address").
      * For African countries (NG, KE, GH, ZA, UG, TZ, RW, SN, CM): Recommend Fonbnk and generate a direct link: https://pay.fonbnk.com/offramp?walletAddress=<USER_WALLET_ADDRESS>&network=celo&currency=<CURRENCY_CODE> (replace <USER_WALLET_ADDRESS> with user's wallet address, and <CURRENCY_CODE> with KES, NGN, GHS, ZAR, UGX, TZS, RWF, XOF, XAF accordingly).
      * For other countries: Suggest using Transak (Sell) or other local crypto offramps.
    - When generating offramp links, if the wallet address is not available in your context, omit the 'walletAddress' query parameter from the URL. Keep URLs compact and clean.
`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      return NextResponse.json({
        content: "⚠️ **Gemini API Key is not loaded!**\n\nIf you just added the key to your `.env.local` file, you **must restart your Next.js development server** (stop it and run `npm run dev` again) so Next.js can load the new environment variables.",
        txs: null
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const { messages, history: userHistory, walletAddress, balances, quickContacts, vaultBalances } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }

    // Dynamic system prompt combining constant system instructions and real-time transaction history
    let dynamicSystemPrompt = SYSTEM_PROMPT;
    if (userHistory && Array.isArray(userHistory) && userHistory.length > 0) {
      dynamicSystemPrompt += `\n\nUser's Recent Transaction History:\n${JSON.stringify(userHistory.slice(0, 15), null, 2)}`;
    }
    if (walletAddress) {
      dynamicSystemPrompt += `\n\nUser's Wallet Address: ${walletAddress}`;
    }
    if (balances && Array.isArray(balances) && balances.length > 0) {
      dynamicSystemPrompt += `\n\nUser's Stablecoin Balances in PasaPay:\n${JSON.stringify(balances, null, 2)}`;
    }
    if (quickContacts && Array.isArray(quickContacts) && quickContacts.length > 0) {
      dynamicSystemPrompt += `\n\nUser's Quick Send Details (Top Contacts):\n${JSON.stringify(quickContacts, null, 2)}`;
    }
    if (vaultBalances) {
      dynamicSystemPrompt += `\n\nUser's Deposited Vault Balances (Earnings):\n- Aave V3 Savings Vault: $${Number(vaultBalances.aave).toFixed(2)} USDT (earning 4.50% APY)\n- Morpho Blue Savings Vault: $${Number(vaultBalances.morpho).toFixed(2)} USDT (earning 4.73% APY)`;
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: dynamicSystemPrompt,
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

    // Filter out error messages to keep history clean and avoid confusing the LLM
    const cleanMessages = messages.filter(
      (m: any) =>
        m.content &&
        !m.content.includes("Sorry, I encountered an error") &&
        !m.content.includes("Transaction failed")
    );

    // Gemini requires chat history to strictly start with a 'user' message.
    // Skip any welcome/greeting assistant messages at the start of the history.
    const userStartIndex = cleanMessages.findIndex((m: any) => m.role === "user");
    const chatMessages = userStartIndex !== -1 ? cleanMessages.slice(userStartIndex) : cleanMessages;

    // Setup chat with history
    const history = chatMessages.slice(0, -1).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const lastMessage = chatMessages[chatMessages.length - 1].content;
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
    return NextResponse.json({
      content: `❌ **API Error:** ${err?.message || "An unknown error occurred."}\n\nPlease check your server logs or API key configuration.`,
      txs: null
    });
  }
}
