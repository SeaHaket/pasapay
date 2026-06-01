import { NextRequest, NextResponse } from "next/server";
import { newKit } from "@celo/contractkit";
import { OdisUtils } from "@celo/identity";
import type { AuthSigner } from "@celo/identity/lib/odis/query";

const MINIPAY_ISSUER = "0x7888612486844Bb9BE598668081c59A9f7367FBc";
const CELO_RPC = process.env.CELO_RPC ?? "https://forno.celo.org";

// In-memory rate limiter: 5 requests per IP per 60-second window
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests — try again in a minute" }, { status: 429 });
  }
  try {
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string") {
      return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
    }

    // Validate E.164 format: +[country code][number]
    if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
      return NextResponse.json({ error: "Phone must be in E.164 format (e.g. +639171234567)" }, { status: 400 });
    }

    const privateKey = process.env.ODIS_SIGNER_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({ error: "ODIS signer not configured" }, { status: 503 });
    }

    // Set up ContractKit with backend signer
    const kit = newKit(CELO_RPC);
    const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
    kit.addAccount(pk);
    const locals = kit.connection.getLocalAccounts();
    if (!locals.length) throw new Error("No local account loaded");
    kit.defaultAccount = locals[0];
    const quotaAccount = locals[0] as `0x${string}`;

    const serviceContext = OdisUtils.Query.getServiceContext(
      OdisUtils.Query.OdisContextName.MAINNET,
      OdisUtils.Query.OdisAPI.PNP
    );

    const authSigner: AuthSigner = {
      authenticationMethod: OdisUtils.Query.AuthenticationMethod.WALLET_KEY,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contractKit: kit as any,
    };

    // Obfuscate the phone number via ODIS
    let obfuscatedIdentifier: string;
    try {
      const result = await OdisUtils.Identifier.getObfuscatedIdentifier(
        phone,
        OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
        quotaAccount,
        authSigner,
        serviceContext
      );
      obfuscatedIdentifier = result.obfuscatedIdentifier;
    } catch (err: any) {
      if (err?.message === "odisQuotaError") {
        console.log("[resolve-phone] Quota depleted or account unregistered. Attempting self-healing...");
        try {
          // 1. Ensure account is registered on the Celo Accounts contract
          const accountsContract = await kit.contracts.getAccounts();
          const isRegistered = await accountsContract.isAccount(quotaAccount);
          if (!isRegistered) {
            console.log("[resolve-phone] Registering backend signer on-chain...");
            const tx = await accountsContract.createAccount();
            await tx.sendAndWaitForReceipt({ from: quotaAccount });
          }

          // 2. Buy more quota if cUSD is available
          const stableToken = await kit.contracts.getStableToken();
          const usdRaw = await stableToken.balanceOf(quotaAccount);
          const usdVal = parseFloat(kit.web3.utils.fromWei(usdRaw.toString(), "ether"));

          if (usdVal >= 0.01) {
            const payAmountWei = kit.web3.utils.toWei("0.05", "ether"); // pay 0.05 cUSD
            const odisPaymentsAddress = "0xAE6B29f31B96e61DdDc792f45fDa4e4F0356D0CB";
            
            console.log("[resolve-phone] Approving cUSD for OdisPayments...");
            const tx1 = await stableToken.increaseAllowance(odisPaymentsAddress, payAmountWei);
            await tx1.sendAndWaitForReceipt({ from: quotaAccount });

            console.log("[resolve-phone] Depositing cUSD to buy ODIS quota...");
            const odisPaymentsAbi = [
              {
                "inputs": [
                  { "internalType": "address", "name": "account", "type": "address" },
                  { "internalType": "uint256", "name": "amount", "type": "uint256" }
                ],
                "name": "payInCUSD",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
              }
            ];
            const odisPaymentsContract = new kit.web3.eth.Contract(odisPaymentsAbi as any, odisPaymentsAddress);
            const gasEstimate = await odisPaymentsContract.methods.payInCUSD(quotaAccount, payAmountWei).estimateGas({ from: quotaAccount });
            await odisPaymentsContract.methods.payInCUSD(quotaAccount, payAmountWei).send({
              from: quotaAccount,
              gas: Math.ceil(gasEstimate * 1.2),
            });

            console.log("[resolve-phone] Quota successfully topped up! Retrying ODIS query...");
            const result = await OdisUtils.Identifier.getObfuscatedIdentifier(
              phone,
              OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
              quotaAccount,
              authSigner,
              serviceContext
            );
            obfuscatedIdentifier = result.obfuscatedIdentifier;
          } else {
            throw new Error("Insufficient backend cUSD balance to auto-purchase quota");
          }
        } catch (healErr: any) {
          console.error("[resolve-phone] Self-healing failed:", healErr);
          throw err; // throw original quota error
        }
      } else {
        throw err;
      }
    }

    // Look up attestations from MiniPay issuer
    const federated = await kit.contracts.getFederatedAttestations();
    const { accounts } = await federated.lookupAttestations(obfuscatedIdentifier, [
      MINIPAY_ISSUER,
    ]);

    const resolved = accounts[0] ?? null;
    return NextResponse.json({ address: resolved }, { status: 200 });
  } catch (err: any) {
    console.error("[resolve-phone] ODIS error:", err);
    return NextResponse.json({ error: err?.message || "Failed to resolve phone number" }, { status: 500 });
  }
}
