import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uhsslexvmoecwvcjiwit.supabase.co',
      },
    ],
  },
};

export default nextConfig;
