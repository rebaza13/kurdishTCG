import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // `@tcg/types` lives in ../packages/types, outside this app — Turbopack only
  // resolves files under its root, so point the root at the repo.
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "sbahhcottihywlmaglvn.supabase.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
