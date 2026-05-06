import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PasaPay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://forno.celo.org" />
        <link rel="preconnect" href="https://li.quest" />
      </head>
      <body>{children}</body>
    </html>
  );
}
