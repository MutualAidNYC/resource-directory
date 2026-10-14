import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the site is plain files in out/, built from the build's data
  // (src/lib/data.ts). Nothing runs on a server.
  output: "export",
  // Static export can't optimize images on request (Header.tsx uses next/image).
  images: { unoptimized: true },
};

export default nextConfig;
