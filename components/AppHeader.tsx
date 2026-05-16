"use client";
import Image from "next/image";
import { Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";

export default function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header__logo">
        <Image src="/logo.svg" alt="PasaPay" width={28} height={28} />
        <span>PasaPay</span>
      </div>
      <div className="app-header__actions">
        <Link href="/settings" aria-label="Settings">
          <button className="btn btn--ghost" style={{ width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Settings size={22} />
          </button>
        </Link>
      </div>
    </header>
  );
}
