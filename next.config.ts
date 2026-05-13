import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // @celo/contractkit uses Node builtins — exclude from browser bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, net: false, tls: false, child_process: false,
        crypto: false, stream: false, path: false, os: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        // MiniPay embeds the app in a WebView — X-Frame-Options must stay ALLOWALL.
        // We compensate with additional hardening headers on every route.
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=*, microphone=()" },
        ],
      },
      {
        // CORS wildcard scoped only to API routes — pages do not need it
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
      {
        // Long-lived cache for immutable Next.js static chunks
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
