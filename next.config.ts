import type { NextConfig } from "next";

import "@/env";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typedRoutes: true,
};

export default nextConfig;
