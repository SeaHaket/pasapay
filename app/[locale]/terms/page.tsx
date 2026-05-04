"use client";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { ChevronLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <main className="page page-padded" style={{ paddingBottom: 100 }}>
        <Link href="/settings" className="btn btn--ghost" style={{ width: "auto", padding: "0", marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={20} /> Back to Settings
        </Link>
        <h1 className="section-title">Terms of Service</h1>
        
        <div className="card" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          <p style={{ marginBottom: 16 }}><strong>Last Updated: May 2026</strong></p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: 16 }}>By accessing and using PasaPay ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.</p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>2. Description of Service</h2>
          <p style={{ marginBottom: 16 }}>PasaPay is a non-custodial interface that allows users to interact with smart contracts on the Celo blockchain and third-party offramp providers (such as Coins.ph, Transak, and Fonbnk) to facilitate the transfer and conversion of stablecoins.</p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>3. Non-Custodial Nature</h2>
          <p style={{ marginBottom: 16 }}>PasaPay does not hold, manage, or custody your digital assets. All transactions are executed directly from your connected MiniPay wallet. You are solely responsible for the security of your wallet and private keys.</p>

          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>4. Third-Party Services</h2>
          <p style={{ marginBottom: 16 }}>The App integrates with third-party providers for bridging and fiat conversion. PasaPay is not responsible for the performance, fees, or failures of these third-party services. Your use of these services is subject to their respective terms and conditions.</p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>5. Limitation of Liability</h2>
          <p style={{ marginBottom: 16 }}>To the maximum extent permitted by law, PasaPay and its developers shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the App, including but not limited to loss of funds due to user error, network congestion, or third-party provider failures.</p>
        </div>
      </main>
    </>
  );
}
