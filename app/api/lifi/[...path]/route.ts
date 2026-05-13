import { NextRequest, NextResponse } from "next/server";

const LIFI_BASE = "https://li.quest/v1";

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(req, await params);
}

async function proxy(req: NextRequest, { path }: { path: string[] }) {
  const apiKey = process.env.LIFI_API_KEY;
  const upstream = `${LIFI_BASE}/${path.join("/")}${req.nextUrl.search}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-lifi-api-key": apiKey } : {}),
  };

  const isPost = req.method === "POST";
  const body = isPost ? await req.text() : undefined;

  const res = await fetch(upstream, { method: req.method, headers, body });
  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "application/json" },
  });
}
