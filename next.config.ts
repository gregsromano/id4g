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
      // Lifestyle uploads still POST the file to a server action, and the
      // framework default of 1MB rejects any real photo before our own
      // per-file validation runs.
      //
      // 4mb, NOT the 25mb this used to say: **Vercel caps a function request
      // body at 4.5MB** and returns 413 FUNCTION_PAYLOAD_TOO_LARGE past it.
      // That ceiling is infrastructure-level and cannot be raised here — this
      // setting can only lower the limit within it, so a larger number is
      // fiction in production and merely moves the failure from a readable
      // error to an unhandled 413. Product media avoids the ceiling entirely
      // by uploading browser -> Supabase with a signed token.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
