import type { NextConfig } from "next";

// Medya: varsayilan GORELI /media tabani — ayni origin'den sunulur ve asagida
// rewrites ile MinIO'ya (container ici S3_INTERNAL_URL) proxy'lenir. Boylece
// tarayici VE next/image optimizer ayni kapidan gecer (mutlak localhost:9000
// split-horizon'du: optimizer container icinden erisemiyordu -> kirik kapak).
// Prod'da S3_PUBLIC_URL'e mutlak CDN/S3 domain'i girilirse remotePatterns +
// CSP origin'i otomatik turetilir, rewrite devre disi kalir.
const mediaPublic = process.env.S3_PUBLIC_URL ?? "/media";
const mediaUrl = mediaPublic.startsWith("http") ? new URL(mediaPublic) : null;
const mediaOrigin = mediaUrl?.origin ?? "";
// Rewrite hedefi: container aginda MinIO + bucket (yalniz goreli modda kullanilir).
const mediaInternal = `${process.env.S3_INTERNAL_URL ?? "http://minio:9000"}/${process.env.S3_BUCKET ?? "kron-media"}`;

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
  `img-src 'self' data: blob:${mediaOrigin ? ` ${mediaOrigin}` : ""}`,
  `font-src 'self' data:`,
  `style-src 'self' 'unsafe-inline'`,
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self' ${apiOrigin}${mediaOrigin ? ` ${mediaOrigin}` : ""}`,
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
    // Goreli /media modunda uzak host yok (ayni origin) -> remotePatterns bos.
    remotePatterns: mediaUrl
      ? [
          {
            protocol: mediaUrl.protocol.replace(":", "") as "http" | "https",
            hostname: mediaUrl.hostname,
            port: mediaUrl.port,
            pathname: "/**",
          },
        ]
      : [],
  },
  async rewrites() {
    // /media/<key> -> MinIO (container ici). Yalniz goreli modda gerekli;
    // mutlak modda URL'ler dogrudan CDN/S3'e gider, bu kural ise karismaz.
    return mediaUrl ? [] : [{ source: "/media/:path*", destination: `${mediaInternal}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
