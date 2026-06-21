"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Smartphone, CircleDollarSign, Coins, Landmark } from "lucide-react";
import { OfframpProvider } from "@/config/countries";

export type SendRoute = OfframpProvider | "vault" | "vault_aave" | "vault_morpho" | "gcash" | "pdax";

type Props = {
  selected: SendRoute | null;
  onSelect: (r: SendRoute) => void;
  supported: OfframpProvider[];
  localCryptoName?: string;
  bankOfframpExample?: string;
  currencyCode?: string;
};

type RouteItem = {
  id: SendRoute;
  Icon: React.ElementType;
  color: string;
  titleKey: string;
  descKey: string;
  badge?: string;
  comingSoon?: boolean;
};

const ROUTES: RouteItem[] = [
  { id: "minipay", Icon: Smartphone, color: "var(--green)", titleKey: "routeMinipay", descKey: "routeMinipayDesc" },
  { id: "fonbnk", Icon: Coins, color: "#9C27B0", titleKey: "routeFonbnk", descKey: "routeFonbnkDesc" },
  { id: "transak", Icon: Landmark, color: "#2196F3", titleKey: "routeTransak", descKey: "routeTransakDesc", comingSoon: true },
  { id: "localcrypto", Icon: CircleDollarSign, color: "#FF9800", titleKey: "routeLocalCrypto", descKey: "routeLocalCryptoDesc", badge: "BSC" },
];

export default function RouteSelector({ selected, onSelect, supported, localCryptoName, bankOfframpExample, currencyCode }: Props) {
  const t = useTranslations("send");
  const [shownNote, setShownNote] = useState<SendRoute | null>(null);

  const isMinipaySelected = selected === "minipay" || selected === "gcash" || selected === "pdax";
  const [minipayExpanded, setMinipayExpanded] = useState(isMinipaySelected);

  const visibleRoutes = ROUTES.filter(r => supported.includes(r.id as OfframpProvider));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visibleRoutes.map(r => {
        const Icon = r.Icon;
        const isDynamicRoute = r.id === "transak" || r.id === "fonbnk";
        const isDisabled = r.comingSoon === true;

        const isCurrentSelected = r.id === "minipay" ? isMinipaySelected : selected === r.id;

        return (
          <div key={r.id}>
            <button
              className={`route-card${isCurrentSelected && !isDisabled ? " route-card--selected" : ""}`}
              onClick={() => {
                if (isDisabled) {
                  setShownNote(prev => prev === r.id ? null : r.id);
                } else if (r.id === "minipay" && currencyCode === "PHP") {
                  setMinipayExpanded(prev => !prev);
                } else {
                  setShownNote(null);
                  onSelect(r.id);
                }
              }}
              style={{ width: "100%", background: "none", textAlign: "left", opacity: isDisabled ? 0.55 : 1 }}
            >
              <div className="route-card__icon" style={{ color: isDisabled ? "var(--text-secondary)" : r.color }}>
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <div className="route-card__info">
                <div className="route-card__title">
                  {r.id === "localcrypto" && localCryptoName ? localCryptoName : t(r.titleKey as any)}
                  {!isDisabled && r.badge && (
                    <span className="chip chip--pending" style={{ marginLeft: 8, fontSize: 10 }}>{r.badge}</span>
                  )}
                  {isDisabled && (
                    <span className="chip chip--pending" style={{ marginLeft: 8, fontSize: 10 }}>Coming Soon</span>
                  )}
                </div>
                <div className="route-card__desc">
                  {isDynamicRoute && bankOfframpExample && currencyCode
                    ? t(r.descKey as any, { currency: currencyCode, examples: bankOfframpExample })
                    : t(r.descKey as any)}
                </div>
              </div>
              <div className="route-card__arrow" style={{ transform: (r.id === "minipay" && currencyCode === "PHP" && minipayExpanded) ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>›</div>
            </button>

            {r.id === "minipay" && currencyCode === "PHP" && minipayExpanded && (
              <div style={{
                margin: "4px 0 10px 16px",
                padding: "8px 0 8px 12px",
                borderLeft: "2px solid var(--green)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}>
                <button
                  className={`route-card${selected === "minipay" ? " route-card--selected" : ""}`}
                  onClick={() => onSelect("minipay")}
                  style={{ width: "100%", background: "none", textAlign: "left", padding: "10px 14px" }}
                >
                  <div className="route-card__info" style={{ marginLeft: 0 }}>
                    <div className="route-card__title" style={{ fontSize: 13, fontWeight: 700 }}>
                      {t("routeMinipayUser")}
                    </div>
                    <div className="route-card__desc" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {t("routeMinipayUserDesc")}
                    </div>
                  </div>
                  <div className="route-card__arrow">›</div>
                </button>

                <button
                  className={`route-card${selected === "gcash" ? " route-card--selected" : ""}`}
                  onClick={() => onSelect("gcash")}
                  style={{ width: "100%", background: "none", textAlign: "left", padding: "10px 14px" }}
                >
                  <div className="route-card__info" style={{ marginLeft: 0 }}>
                    <div className="route-card__title" style={{ fontSize: 13, fontWeight: 700 }}>
                      {t("routeGcashCelo")}
                    </div>
                    <div className="route-card__desc" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {t("routeGcashCeloDesc")}
                    </div>
                  </div>
                  <div className="route-card__arrow">›</div>
                </button>

                <button
                  className={`route-card${selected === "pdax" ? " route-card--selected" : ""}`}
                  onClick={() => onSelect("pdax")}
                  style={{ width: "100%", background: "none", textAlign: "left", padding: "10px 14px" }}
                >
                  <div className="route-card__info" style={{ marginLeft: 0 }}>
                    <div className="route-card__title" style={{ fontSize: 13, fontWeight: 700 }}>
                      {t("routePdaxCelo")}
                    </div>
                    <div className="route-card__desc" style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {t("routePdaxCeloDesc")}
                    </div>
                  </div>
                  <div className="route-card__arrow">›</div>
                </button>
              </div>
            )}

            {isDisabled && shownNote === r.id && (
              <div style={{
                margin: "4px 0 4px 0",
                padding: "10px 14px",
                background: "rgba(120,120,120,0.08)",
                borderRadius: 8,
                borderLeft: "3px solid var(--border)",
                fontSize: 13,
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}>
                🚧 This withdrawal option is coming soon! We&apos;re working on it — check back for updates.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
