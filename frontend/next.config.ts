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
    remotePatterns: [
      { protocol: "https", hostname: "sbahhcottihywlmaglvn.supabase.co" },
      // Cloudflare R2 public bucket (product / franchise images).
      ...(r2Host ? [{ protocol: "https" as const, hostname: r2Host }] : []),
    ],
  },
};

export default withNextIntl(nextConfig);
