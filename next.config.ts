import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  fallbacks: {
    document: "/offline",
  },
  workboxOptions: {
    // Exclude Supabase from service worker cache to prevent token lock deadlocks
    // and session revocation issues caused by delayed cache lookups
    exclude: [/^https:\/\/.*\.supabase\.co\/.*/],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
        handler: 'NetworkOnly',
      }
    ]
  }
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withPWA(nextConfig);
