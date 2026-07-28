import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // id4g lives inside another repo folder that has its own lockfile, so pin
  // the Turbopack root to this project to avoid the wrong root being inferred.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
