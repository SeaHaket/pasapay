export type OfframpProvider = "minipay" | "localcrypto" | "transak" | "fonbnk";

export type CountryConfig = {
  id: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  phonePrefix: string;
  supportedOfframps: OfframpProvider[];
  localCryptoName: string;
  bankOfframpExample: string;
  phonePlaceholder: string;
};

export const COUNTRIES: CountryConfig[] = [
  // ─── Southeast Asia ────────────────────────────────────────────────────────
  {
    id: "PH",
    name: "Philippines",
    currencyCode: "PHP",
    currencySymbol: "₱",
    phonePrefix: "+63",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Coins.ph",
    bankOfframpExample: "GCash, Maya, or bank",
    phonePlaceholder: "+63 917 123 4567",
  },
  {
    id: "ID",
    name: "Indonesia",
    currencyCode: "IDR",
    currencySymbol: "Rp",
    phonePrefix: "+62",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Tokocrypto or Indodax",
    bankOfframpExample: "GoPay, OVO, or Dana",
    phonePlaceholder: "+62 812 3456 789",
  },
  {
    id: "VN",
    name: "Vietnam",
    currencyCode: "VND",
    currencySymbol: "₫",
    phonePrefix: "+84",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Remitano or VNDC",
    bankOfframpExample: "MoMo, ZaloPay, or ViettelPay",
    phonePlaceholder: "+84 90 123 4567",
  },
  {
    id: "MY",
    name: "Malaysia",
    currencyCode: "MYR",
    currencySymbol: "RM",
    phonePrefix: "+60",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Luno or MX Global",
    bankOfframpExample: "Touch 'n Go eWallet or DuitNow",
    phonePlaceholder: "+60 12 345 6789",
  },
  {
    id: "TH",
    name: "Thailand",
    currencyCode: "THB",
    currencySymbol: "฿",
    phonePrefix: "+66",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Bitkub or Satang Pro",
    bankOfframpExample: "PromptPay or TrueMoney Wallet",
    phonePlaceholder: "+66 81 234 5678",
  },

  // ─── South Asia ────────────────────────────────────────────────────────────
  {
    id: "IN",
    name: "India",
    currencyCode: "INR",
    currencySymbol: "₹",
    phonePrefix: "+91",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "CoinDCX or WazirX",
    bankOfframpExample: "UPI, PhonePe, or Google Pay",
    phonePlaceholder: "+91 98765 43210",
  },

  // ─── East Asia ─────────────────────────────────────────────────────────────
  {
    id: "SG",
    name: "Singapore",
    currencyCode: "SGD",
    currencySymbol: "S$",
    phonePrefix: "+65",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Coinhako or Independent Reserve",
    bankOfframpExample: "PayNow or FAST bank transfer",
    phonePlaceholder: "+65 8123 4567",
  },
  {
    id: "KR",
    name: "South Korea",
    currencyCode: "KRW",
    currencySymbol: "₩",
    phonePrefix: "+82",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Upbit or Bithumb",
    bankOfframpExample: "KakaoPay, Toss, or Naver Pay",
    phonePlaceholder: "+82 10-1234-5678",
  },
  {
    id: "JP",
    name: "Japan",
    currencyCode: "JPY",
    currencySymbol: "¥",
    phonePrefix: "+81",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "bitFlyer or Coincheck",
    bankOfframpExample: "PayPay, LINE Pay, or au PAY",
    phonePlaceholder: "+81 90-1234-5678",
  },

  // ─── Latin America ─────────────────────────────────────────────────────────
  {
    id: "BR",
    name: "Brazil",
    currencyCode: "BRL",
    currencySymbol: "R$",
    phonePrefix: "+55",
    supportedOfframps: ["minipay", "transak", "localcrypto"],
    localCryptoName: "Mercado Bitcoin or Bitpreço",
    bankOfframpExample: "Pix (instant bank transfer)",
    phonePlaceholder: "+55 11 91234 5678",
  },

  // ─── Africa (Fonbnk-supported) ─────────────────────────────────────────────
  {
    id: "NG",
    name: "Nigeria",
    currencyCode: "NGN",
    currencySymbol: "₦",
    phonePrefix: "+234",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Quidax or BuyCoins",
    bankOfframpExample: "OPay, PalmPay, or GTBank",
    phonePlaceholder: "+234 803 123 4567",
  },
  {
    id: "KE",
    name: "Kenya",
    currencyCode: "KES",
    currencySymbol: "KSh",
    phonePrefix: "+254",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card or Paxful",
    bankOfframpExample: "M-Pesa or Airtel Money",
    phonePlaceholder: "+254 712 345 678",
  },
  {
    id: "GH",
    name: "Ghana",
    currencyCode: "GHS",
    currencySymbol: "GH₵",
    phonePrefix: "+233",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card or Binance P2P",
    bankOfframpExample: "MTN MoMo or AirtelTigo Money",
    phonePlaceholder: "+233 24 123 4567",
  },
  {
    id: "ZA",
    name: "South Africa",
    currencyCode: "ZAR",
    currencySymbol: "R",
    phonePrefix: "+27",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Luno or VALR",
    bankOfframpExample: "SnapScan, Ozow, or instant EFT",
    phonePlaceholder: "+27 82 123 4567",
  },
  {
    id: "UG",
    name: "Uganda",
    currencyCode: "UGX",
    currencySymbol: "USh",
    phonePrefix: "+256",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card or Binance P2P",
    bankOfframpExample: "MTN Mobile Money or Airtel Money",
    phonePlaceholder: "+256 772 123 456",
  },
  {
    id: "TZ",
    name: "Tanzania",
    currencyCode: "TZS",
    currencySymbol: "TSh",
    phonePrefix: "+255",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card or Binance P2P",
    bankOfframpExample: "M-Pesa TZ, Tigo Pesa, or Airtel Money",
    phonePlaceholder: "+255 712 345 678",
  },
  {
    id: "RW",
    name: "Rwanda",
    currencyCode: "RWF",
    currencySymbol: "FRw",
    phonePrefix: "+250",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card or Binance P2P",
    bankOfframpExample: "MTN Mobile Money or Airtel Money",
    phonePlaceholder: "+250 788 123 456",
  },
  {
    id: "SN",
    name: "Senegal",
    currencyCode: "XOF",
    currencySymbol: "CFA",
    phonePrefix: "+221",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Binance P2P or Yellow Card",
    bankOfframpExample: "Wave or Orange Money",
    phonePlaceholder: "+221 77 123 45 67",
  },
  {
    id: "CM",
    name: "Cameroon",
    currencyCode: "XAF",
    currencySymbol: "FCFA",
    phonePrefix: "+237",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card or Binance P2P",
    bankOfframpExample: "MTN MoMo or Orange Money",
    phonePlaceholder: "+237 670 123 456",
  },
];

export function getCountryConfig(id: string): CountryConfig {
  return COUNTRIES.find(c => c.id === id) || COUNTRIES[0];
}
