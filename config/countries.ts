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
  // Southeast Asia & India
  {
    id: "PH",
    name: "Philippines",
    currencyCode: "PHP",
    currencySymbol: "₱",
    phonePrefix: "+63",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
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
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Tokocrypto / Indodax etc.",
    bankOfframpExample: "GoPay, OVO, Dana, or bank",
    phonePlaceholder: "+62 812 3456 789",
  },
  {
    id: "VN",
    name: "Vietnam",
    currencyCode: "VND",
    currencySymbol: "₫",
    phonePrefix: "+84",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Remitano / Binance etc.",
    bankOfframpExample: "MoMo, ZaloPay, or bank",
    phonePlaceholder: "+84 90 123 4567",
  },
  {
    id: "MY",
    name: "Malaysia",
    currencyCode: "MYR",
    currencySymbol: "RM",
    phonePrefix: "+60",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Luno / Binance etc.",
    bankOfframpExample: "Touch 'n Go, GrabPay, or bank",
    phonePlaceholder: "+60 12 345 6789",
  },
  {
    id: "TH",
    name: "Thailand",
    currencyCode: "THB",
    currencySymbol: "฿",
    phonePrefix: "+66",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Bitkub / Binance etc.",
    bankOfframpExample: "PromptPay, TrueMoney, or bank",
    phonePlaceholder: "+66 81 234 5678",
  },
  {
    id: "BR",
    name: "Brazil",
    currencyCode: "BRL",
    currencySymbol: "R$",
    phonePrefix: "+55",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Mercado Bitcoin / Binance etc.",
    bankOfframpExample: "Pix or bank",
    phonePlaceholder: "+55 11 91234 5678",
  },
  {
    id: "IN",
    name: "India",
    currencyCode: "INR",
    currencySymbol: "₹",
    phonePrefix: "+91",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "WazirX / CoinDCX etc.",
    bankOfframpExample: "UPI, Paytm, or bank",
    phonePlaceholder: "+91 98765 43210",
  },

  // Africa (Fonbnk supported, Transak omitted)
  {
    id: "NG",
    name: "Nigeria",
    currencyCode: "NGN",
    currencySymbol: "₦",
    phonePrefix: "+234",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Quidax / Binance etc.",
    bankOfframpExample: "Bank Transfer",
    phonePlaceholder: "+234 803 123 4567",
  },
  {
    id: "KE",
    name: "Kenya",
    currencyCode: "KES",
    currencySymbol: "KSh",
    phonePrefix: "+254",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
    bankOfframpExample: "M-Pesa",
    phonePlaceholder: "+254 712 345 678",
  },
  {
    id: "GH",
    name: "Ghana",
    currencyCode: "GHS",
    currencySymbol: "GH₵",
    phonePrefix: "+233",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
    bankOfframpExample: "Mobile Money",
    phonePlaceholder: "+233 24 123 4567",
  },
  {
    id: "ZA",
    name: "South Africa",
    currencyCode: "ZAR",
    currencySymbol: "R",
    phonePrefix: "+27",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Luno / VALR etc.",
    bankOfframpExample: "Bank Transfer",
    phonePlaceholder: "+27 82 123 4567",
  },
  {
    id: "UG",
    name: "Uganda",
    currencyCode: "UGX",
    currencySymbol: "USh",
    phonePrefix: "+256",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
    bankOfframpExample: "Mobile Money",
    phonePlaceholder: "+256 772 123 456",
  },
  {
    id: "TZ",
    name: "Tanzania",
    currencyCode: "TZS",
    currencySymbol: "TSh",
    phonePrefix: "+255",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
    bankOfframpExample: "Mobile Money",
    phonePlaceholder: "+255 712 345 678",
  },
  {
    id: "RW",
    name: "Rwanda",
    currencyCode: "RWF",
    currencySymbol: "FRw",
    phonePrefix: "+250",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
    bankOfframpExample: "Mobile Money",
    phonePlaceholder: "+250 788 123 456",
  },
  {
    id: "SN",
    name: "Senegal",
    currencyCode: "XOF",
    currencySymbol: "CFA",
    phonePrefix: "+221",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Binance etc.",
    bankOfframpExample: "Mobile Money",
    phonePlaceholder: "+221 77 123 45 67",
  },
  {
    id: "CM",
    name: "Cameroon",
    currencyCode: "XAF",
    currencySymbol: "FCFA",
    phonePrefix: "+237",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
    bankOfframpExample: "Mobile Money",
    phonePlaceholder: "+237 670 123 456",
  },
];

export function getCountryConfig(id: string): CountryConfig {
  return COUNTRIES.find(c => c.id === id) || COUNTRIES[0];
}
