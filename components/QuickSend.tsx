"use client";
import { useRouter } from "@/i18n/navigation";
import { openFonbnk } from "@/lib/fonbnk";
import { type QuickContact } from "@/lib/history";

const COUNTRY_FLAGS: Record<string, string> = {
  PH: "🇵🇭", NG: "🇳🇬", KE: "🇰🇪", GH: "🇬🇭", ZA: "🇿🇦",
  UG: "🇺🇬", TZ: "🇹🇿", RW: "🇷🇼", SN: "🇸🇳", CM: "🇨🇲",
  IN: "🇮🇳", ID: "🇮🇩", VN: "🇻🇳", MY: "🇲🇾", TH: "🇹🇭",
  SG: "🇸🇬", KR: "🇰🇷", JP: "🇯🇵", BR: "🇧🇷",
};

function avatarColor(address: string, route: string) {
  if (route === "fonbnk") return "#9C27B0";
  const hue = parseInt(address.slice(2, 6), 16) % 360;
  return `hsl(${hue}, 60%, 42%)`;
}

function initials(display: string, route: string): string {
  if (route === "fonbnk") return "🏦";
  if (display.startsWith("0x")) return display.slice(2, 4).toUpperCase();
  if (display.startsWith("+")) return display.replace(/\D/g, "").slice(1, 3);
  const words = display.trim().split(/\s+/);
  return words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : display.slice(0, 2).toUpperCase();
}

function shortName(display: string, route: string): string {
  if (route === "fonbnk") return display; // already "Fonbnk (PHP)" etc.
  if (display.startsWith("0x")) return display.slice(0, 6) + "…";
  const first = display.trim().split(/\s+/)[0];
  return first.length > 10 ? first.slice(0, 9) + "…" : first;
}

type Props = { contacts: QuickContact[]; address?: string };

export default function QuickSend({ contacts, address }: Props) {
  const router = useRouter();

  function handleTap(c: QuickContact) {
    if (c.route === "fonbnk") {
      openFonbnk(address ?? "", c.currencyCode);
      return;
    }
    sessionStorage.setItem(
      "pp_quicksend",
      JSON.stringify({
        recipientAddress: c.recipientAddress,
        recipientDisplay: c.recipientDisplay,
        countryId: c.countryId,
        route: c.route,
      }),
    );
    router.push("/send");
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <p className="section-title" style={{ marginBottom: 12 }}>Quick Send</p>
      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
        {contacts.map(c => (
          <button
            key={c.route === "fonbnk" ? `fonbnk-${c.countryId}` : c.recipientAddress}
            onClick={() => handleTap(c)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 6, background: "none", border: "none", cursor: "pointer",
              flexShrink: 0, padding: "4px 2px",
            }}
          >
            <div style={{ position: "relative" }}>
              <div style={{
                width: 52, height: 52, borderRadius: "50%",
                background: avatarColor(c.recipientAddress, c.route),
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
              }}>
                {initials(c.recipientDisplay, c.route)}
              </div>
              {COUNTRY_FLAGS[c.countryId] && (
                <span style={{
                  position: "absolute", bottom: -2, right: -4,
                  fontSize: 14, lineHeight: 1,
                }}>
                  {COUNTRY_FLAGS[c.countryId]}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", maxWidth: 60, textAlign: "center", lineHeight: 1.3 }}>
              {shortName(c.recipientDisplay, c.route)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
