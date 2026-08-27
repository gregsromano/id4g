import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // id4g lives inside another repo folder that has its own lockfile, so pin
  // the Turbopack root to this project to avoid the wrong root being inferred.
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/images/**",
      },
      // Local Supabase (supabase start) serves Storage from 127.0.0.1.
      {
        protocol: "http",
        hostname: "127.0.0.1",
        pathname: "/storage/v1/object/public/images/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Product image uploads (uploadProductImages in
      // admin/products/actions.ts) allow multiple files up to 8MB each; the
      // framework default of 1MB rejects any real product photo before our
      // own per-file validation ever runs.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
