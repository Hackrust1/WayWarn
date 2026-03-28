import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow cross-origin images from map tile providers
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.tile.openstreetmap.org",
      },
      {
        protocol: "https",
        hostname: "cartodb-basemaps-*.global.ssl.fastly.net",
      },
      {
        protocol: "https",
        hostname: "*.basemaps.cartocdn.com",
      },
    ],
  },
  // Leaflet is client-side only — loaded via dynamic import in components
  // No special SSR config needed; we use `dynamic(() => import(...), { ssr: false })`
};

export default nextConfig;
