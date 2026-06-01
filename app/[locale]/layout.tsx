import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "optional",
  variable: "--font-inter",
  preload: true,
});

export const metadata: Metadata = {
  title: "PasaPay — Send Money Home",
  description: "Fast, low-cost remittance powered by Celo MiniPay. Send stablecoins to the Philippines in seconds.",
  icons: {
    icon: "/favicon.svg",
    apple: "/logo.svg",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0D1B2A",
};

import PasaCopilotWidget from "@/components/PasaCopilotWidget";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  const messages = await getMessages({ locale });

  return (
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="app-shell">
            {children}
            <PasaCopilotWidget />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
