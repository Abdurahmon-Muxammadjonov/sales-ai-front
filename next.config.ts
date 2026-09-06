import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the trace root: a stray lockfile above this directory otherwise makes
  // Next guess the home folder is the workspace.
  outputFileTracingRoot: path.resolve("."),
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
};

export default withNextIntl(nextConfig);
