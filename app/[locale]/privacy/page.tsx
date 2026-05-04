"use client";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <main className="page page-padded" style={{ paddingBottom: 100 }}>
        <Link href="/settings" className="btn btn--ghost" style={{ width: "auto", padding: "0", marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ChevronLeft size={20} /> Back to Settings
        </Link>
        <h1 className="section-title">Privacy Policy</h1>
        
        <div className="card" style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>
          <p style={{ marginBottom: 16 }}><strong>Last Updated: May 2026</strong></p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>1. Introduction</h2>
          <p style={{ marginBottom: 16 }}>PasaPay respects your privacy. Because PasaPay is a decentralized, non-custodial interface, we do not require you to create an account, nor do we collect personally identifiable information (PII) such as your name, email, or physical address.</p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>2. Data We Collect</h2>
          <p style={{ marginBottom: 16 }}><strong>Blockchain Data:</strong> By using the App, your wallet address and transaction history are broadcast to the Celo blockchain, which is a public ledger. This information is publicly visible and outside of our control.</p>
          <p style={{ marginBottom: 16 }}><strong>Phone Number Resolution:</strong> If you use the phone number resolution feature, the phone number is sent securely to the Celo ODIS (Oblivious Decentralized Identifier Service) via our proxy to retrieve the corresponding wallet address. We do not store or log these phone numbers.</p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>3. Third-Party Providers</h2>
          <p style={{ marginBottom: 16 }}>When you choose to offramp your funds via third-party providers (like Transak or Fonbnk), you may be required to provide them with personal and financial information to comply with KYC/AML regulations. This data is collected directly by them and is governed by their respective Privacy Policies.</p>

          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>4. Cookies and Analytics</h2>
          <p style={{ marginBottom: 16 }}>We may use basic local storage to remember your app preferences (like your selected language or default route). We do not use tracking cookies or invasive third-party analytics.</p>
          
          <h2 style={{ fontSize: 15, color: "var(--text)", marginTop: 24, marginBottom: 8 }}>5. Contact</h2>
          <p style={{ marginBottom: 16 }}>If you have any questions about this Privacy Policy, please contact our support team via our official Telegram channel linked in the app settings.</p>
        </div>
      </main>
    </>
  );
}
