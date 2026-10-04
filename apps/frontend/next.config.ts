import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace package shipped as TypeScript source.
  transpilePackages: ["@repo/design-tokens"],
};

export default nextConfig;
