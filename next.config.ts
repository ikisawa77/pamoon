import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "asia-th.onepiece-cardgame.com",
        pathname: "/images/cardlist/card/**",
      },
    ],
  },
};

export default nextConfig;
