"use client";
import { useTranslations } from "next-intl";
import { Smartphone, CircleDollarSign, Coins } from "lucide-react";
import { OfframpProvider } from "@/config/countries";

export type SendRoute = OfframpProvider;

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
};

const ROUTES: RouteItem[] = [
  { id: "minipay", Icon: Smartphone, color: "var(--green)", titleKey: "routeMinipay", descKey: "routeMinipayDesc" },
  { id: "fonbnk", Icon: Coins, color: "#9C27B0", titleKey: "routeFonbnk", descKey: "routeFonbnkDesc" },
  { id: "localcrypto", Icon: CircleDollarSign, color: "#FF9800", titleKey: "routeLocalCrypto", descKey: "routeLocalCryptoDesc", badge: "ARB" },
];

export default function RouteSelector({ selected, onSelect, supported, localCryptoName, bankOfframpExample, currencyCode }: Props) {
  const t = useTranslations("send");
  
  const visibleRoutes = ROUTES.filter(r => supported.includes(r.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {visibleRoutes.map(r => {
        const Icon = r.Icon;
        const isDynamicRoute = r.id === "transak" || r.id === "fonbnk";
        
        return (
          <button
            key={r.id}
            className={`route-card${selected === r.id ? " route-card--selected" : ""}`}
            onClick={() => onSelect(r.id)}
            style={{ width: "100%", background: "none", textAlign: "left" }}
          >
            <div className="route-card__icon" style={{ color: r.color }}>
              <Icon size={24} strokeWidth={2.5} />
            </div>
            <div className="route-card__info">
              <div className="route-card__title">
                {r.id === "localcrypto" && localCryptoName ? localCryptoName : t(r.titleKey as any)}
                {r.badge && (
                  <span className="chip chip--pending" style={{ marginLeft: 8, fontSize: 10 }}>{r.badge}</span>
                )}
              </div>
              <div className="route-card__desc">
                {isDynamicRoute && bankOfframpExample && currencyCode
                  ? t(r.descKey as any, { currency: currencyCode, examples: bankOfframpExample })
                  : t(r.descKey as any)}
              </div>
            </div>
            <div className="route-card__arrow">›</div>
          </button>
        );
      })}
    </div>
  );
}
