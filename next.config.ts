import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: process.env.NAVER_MAP_CLIENT_ID,
  },
};

export default nextConfig;
