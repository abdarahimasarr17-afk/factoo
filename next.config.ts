import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
  // Turbopack ne trace pas les binaires natifs de sharp (@img/sharp-<plateforme>) : sans eux,
  // l’onboarding et les paramètres plantent sur Vercel dès qu’ils chargent le module logo.
  outputFileTracingIncludes: {
    "/app/**/*": ["./node_modules/@img/**/*"],
    "/f/**/*": ["./node_modules/@img/**/*"],
  },
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
