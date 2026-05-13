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
    const { obfuscatedIdentifier } = await OdisUtils.Identifier.getObfuscatedIdentifier(
      phone,
      OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
      quotaAccount,
      authSigner,
      serviceContext
    );

    // Look up attestations from MiniPay issuer
    const federated = await kit.contracts.getFederatedAttestations();
    const { accounts } = await federated.lookupAttestations(obfuscatedIdentifier, [
      MINIPAY_ISSUER,
    ]);

    const resolved = accounts[0] ?? null;
    return NextResponse.json({ address: resolved }, { status: 200 });
  } catch (err) {
    console.error("[resolve-phone] ODIS error:", err);
    return NextResponse.json({ error: "Failed to resolve phone number" }, { status: 500 });
  }
}
