import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  // A separate build folder (e.g. NEXT_DIST_DIR=.next-dev) lets `next dev` run next to a
  // running production server without overwriting the `.next` build it serves.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [480, 640, 828, 1080, 1280, 1600, 2000],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
