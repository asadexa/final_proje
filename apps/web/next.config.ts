import type { NextConfig } from "next";

// Medya kutuphanesi (MinIO/S3) gorselleri next/image ile optimize edilir;
// uzak host'lar guvenlik geregi acikca tanimlanmali. Host, S3_PUBLIC_URL
// env'inden turetilir (prod'da gercek CDN/S3 domain'i girilir).
const mediaUrl = new URL(process.env.S3_PUBLIC_URL ?? "http://localhost:9000");

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
};

export default nextConfig;
