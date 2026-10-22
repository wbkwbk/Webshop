import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server listens on 0.0.0.0 so it is reachable in this environment.
  // Browsers open it as 127.0.0.1, which Next blocks for HMR unless listed here.
  // A blocked socket makes the dev overlay mount first and steals React's
  // document event listeners, so clicks and typed input never reach the app.
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
