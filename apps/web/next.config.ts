import type { NextConfig } from "next";

// Medya kutuphanesi (MinIO/S3) gorselleri next/image ile optimize edilir;
// uzak host'lar guvenlik geregi acikca tanimlanmali. Host, S3_PUBLIC_URL
// env'inden turetilir (prod'da gercek CDN/S3 domain'i girilir).
const mediaUrl = new URL(process.env.S3_PUBLIC_URL ?? "http://localhost:9000");
const mediaOrigin = mediaUrl.origin;

// Tarayicidan erisilen API origin'i (admin fetch + SSE EventSource buraya gider).
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000")
      .origin;
  } catch {
    return "http://localhost:4000";
  }
})();

const isProd = process.env.NODE_ENV === "production";

// Icerik Guvenligi Politikasi (CSP). frame-ancestors + object-src 'none' ile
// clickjacking ve plugin enjeksiyonu kapatilir. Next hidrasyonu ve Tailwind
// inline stilleri icin script/style'da 'unsafe-inline' bilincli; dev'de HMR
// react-refresh icin 'unsafe-eval' yalniz gelistirmede acilir.
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `object-src 'none'`,
  `frame-ancestors 'self'`,
  `img-src 'self' data: blob: ${mediaOrigin}`,
  `font-src 'self' data:`,
  `style-src 'self' 'unsafe-inline'`,
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self' ${apiOrigin} ${mediaOrigin}`,
  `form-action 'self'`,
  ...(isProd ? ["upgrade-insecure-requests"] : []),
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // HSTS yalniz prod'da (HTTPS): tarayiciyi gelecekte hep https'e zorlar.
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: mediaUrl.protocol.replace(":", "") as "http" | "https",
        hostname: mediaUrl.hostname,
        port: mediaUrl.port,
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
