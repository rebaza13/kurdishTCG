import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `@tcg/types` lives in ../packages/types, outside this app — Turbopack only
  // resolves files under its root, so point the root at the repo.
  turbopack: {
    root: path.resolve(process.cwd(), ".."),
  },
};

export default nextConfig;
