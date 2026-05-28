"use client";
import { useEffect, useRef, useState } from "react";
import { X, Camera, Upload } from "lucide-react";

// Matches plain 0x EVM addresses and strips common URI prefixes:
// ethereum:0x...  /  celo:0x...  /  bsc:0x...  and ?query params
const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

function parseAddress(raw: string): string | null {
  const stripped = raw
    .replace(/^(ethereum|celo|arbitrum|bsc|binance|eip155:\d+):/i, "")
    .split("?")[0]
    .split("@")[0]
    .trim();
  return WALLET_RE.test(stripped) ? stripped : null;
}

type Props = {
  onScan: (address: string) => void;
  onClose: () => void;
};

export default function QrScannerModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState("Point camera at a wallet QR code");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!videoRef.current) return;
      try {
        const QrScanner = (await import("qr-scanner")).default;
        // Point to the worker we copied to /public
        (QrScanner as any).WORKER_PATH = "/qr-scanner-worker.min.js";

        const scanner = new QrScanner(
          videoRef.current,
          (result: { data: string }) => {
            if (cancelled || doneRef.current) return;
            const address = parseAddress(result.data);
            if (address) {
              doneRef.current = true;
              scanner.stop();
              onScan(address);
            } else {
              setHint("Not a wallet address — keep scanning");
              setTimeout(() => {
                if (!cancelled) setHint("Point camera at a wallet QR code");
              }, 2000);
            }
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          },
        );
        scannerRef.current = scanner;
        await scanner.start();
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message ?? String(err);
          setError(
            msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")
              ? "Camera access denied. Please allow camera permission and try again."
              : "Camera not available on this device.",
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || doneRef.current) return;
    try {
      const QrScanner = (await import("qr-scanner")).default;
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const address = parseAddress(result.data);
      if (address) {
        doneRef.current = true;
        scannerRef.current?.stop();
        onScan(address);
      } else {
        setHint("No wallet address found in image");
        setTimeout(() => setHint("Point camera at a wallet QR code"), 2500);
      }
    } catch {
      setHint("Could not read QR code from image");
      setTimeout(() => setHint("Point camera at a wallet QR code"), 2500);
    }
    // reset so the same file can be re-selected
    e.target.value = "";
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "#000",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "16px 16px 12px",
        background: "rgba(0,0,0,0.6)",
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#fff", fontWeight: 700, fontSize: 16, margin: 0 }}>Scan Wallet QR Code</p>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "2px 0 0" }}>Celo or BNB Smart Chain address</p>
        </div>
        {/* Hidden file input for image upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload QR code image"
          style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginRight: 8 }}
        >
          <Upload size={18} color="#fff" />
        </button>
        <button
          onClick={onClose}
          style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
        >
          <X size={18} color="#fff" />
        </button>
      </div>

      {/* Camera viewport */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {error ? (
          <div style={{ padding: 32, textAlign: "center" }}>
            <Camera size={48} color="rgba(255,255,255,0.3)" style={{ marginBottom: 16 }} />
            <p style={{ color: "#f87171", fontSize: 14, lineHeight: 1.5 }}>{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            muted
            playsInline
          />
        )}
      </div>

      {/* Hint */}
      <div style={{
        padding: "20px 24px",
        background: "rgba(0,0,0,0.7)",
        textAlign: "center",
      }}>
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>{hint}</p>
      </div>
    </div>
  );
}
