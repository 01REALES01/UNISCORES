import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /** Imagen Docker mínima: `next build` genera `.next/standalone` */
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "uhsslexvmoecwvcjiwit.supabase.co",
      },
    ],
  },
  async headers() {
    if (process.env.NODE_ENV === 'development') {
        return [];
    }

    return [
      {
        // Assets de Next.js son inmutables (hash en el nombre) solo seguras en produccion
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Página de noticias: cacheable en edge 60s
        source: "/noticias",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=120",
          },
        ],
      },
      {
        // Detalle de noticias: cacheable en edge 2min
        source: "/noticias/:id",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=120, stale-while-revalidate=300",
          },
        ],
      },
      {
        // Medallero: cacheable 5min (solo cambia cuando termina un partido)
        source: "/medallero",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
