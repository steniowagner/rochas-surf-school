import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace package shipped as TypeScript source.
  transpilePackages: ["@rochas-surf-school/design-tokens"],
};

export default nextConfig;
