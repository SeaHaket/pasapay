export type OfframpProvider = "minipay" | "localcrypto" | "transak" | "fonbnk";

export type CountryConfig = {
  id: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  phonePrefix: string;
  supportedOfframps: OfframpProvider[];
  localCryptoName: string;
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
  },
  {
    id: "ID",
    name: "Indonesia",
    currencyCode: "IDR",
    currencySymbol: "Rp",
    phonePrefix: "+62",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Tokocrypto / Indodax etc.",
  },
  {
    id: "VN",
    name: "Vietnam",
    currencyCode: "VND",
    currencySymbol: "₫",
    phonePrefix: "+84",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Remitano / Binance etc.",
  },
  {
    id: "MY",
    name: "Malaysia",
    currencyCode: "MYR",
    currencySymbol: "RM",
    phonePrefix: "+60",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Luno / Binance etc.",
  },
  {
    id: "TH",
    name: "Thailand",
    currencyCode: "THB",
    currencySymbol: "฿",
    phonePrefix: "+66",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Bitkub / Binance etc.",
  },
  {
    id: "BR",
    name: "Brazil",
    currencyCode: "BRL",
    currencySymbol: "R$",
    phonePrefix: "+55",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "Mercado Bitcoin / Binance etc.",
  },
  {
    id: "IN",
    name: "India",
    currencyCode: "INR",
    currencySymbol: "₹",
    phonePrefix: "+91",
    supportedOfframps: ["minipay", "localcrypto", "transak"],
    localCryptoName: "WazirX / CoinDCX etc.",
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
  },
  {
    id: "KE",
    name: "Kenya",
    currencyCode: "KES",
    currencySymbol: "KSh",
    phonePrefix: "+254",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
  },
  {
    id: "GH",
    name: "Ghana",
    currencyCode: "GHS",
    currencySymbol: "GH₵",
    phonePrefix: "+233",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
  },
  {
    id: "ZA",
    name: "South Africa",
    currencyCode: "ZAR",
    currencySymbol: "R",
    phonePrefix: "+27",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Luno / VALR etc.",
  },
  {
    id: "UG",
    name: "Uganda",
    currencyCode: "UGX",
    currencySymbol: "USh",
    phonePrefix: "+256",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
  },
  {
    id: "TZ",
    name: "Tanzania",
    currencyCode: "TZS",
    currencySymbol: "TSh",
    phonePrefix: "+255",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
  },
  {
    id: "RW",
    name: "Rwanda",
    currencyCode: "RWF",
    currencySymbol: "FRw",
    phonePrefix: "+250",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
  },
  {
    id: "SN",
    name: "Senegal",
    currencyCode: "XOF",
    currencySymbol: "CFA",
    phonePrefix: "+221",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Binance etc.",
  },
  {
    id: "CM",
    name: "Cameroon",
    currencyCode: "XAF",
    currencySymbol: "FCFA",
    phonePrefix: "+237",
    supportedOfframps: ["minipay", "localcrypto", "fonbnk"],
    localCryptoName: "Yellow Card / Binance etc.",
  },
];

export function getCountryConfig(id: string): CountryConfig {
  return COUNTRIES.find(c => c.id === id) || COUNTRIES[0];
}
