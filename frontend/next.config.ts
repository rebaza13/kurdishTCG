import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const r2Host = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : null;

const nextConfig: NextConfig = {
  // `@tcg/types` lives in ../packages/types, outside this app — Turbopack only
  // resolves files under its root, so point the root at the repo.
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  images: {
    // 75 is the default; 90 is used for the large franchise panels.
    qualities: [75, 90],
    remotePatterns: [
      { protocol: "https", hostname: "sbahhcottihywlmaglvn.supabase.co" },
      // Cloudflare R2 public bucket (product / franchise images). Hardcoded so
      // images render even when R2_PUBLIC_URL isn't set (e.g. local dev).
      { protocol: "https", hostname: "pub-b7fec24279c14c088e36e18e21ddf97c.r2.dev" },
      ...(r2Host && r2Host !== "pub-b7fec24279c14c088e36e18e21ddf97c.r2.dev"
        ? [{ protocol: "https" as const, hostname: r2Host }]
        : []),
    ],
  },
};

export default withNextIntl(nextConfig);
