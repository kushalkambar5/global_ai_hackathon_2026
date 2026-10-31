import type { NextConfig } from "next";

const getR2Hostname = () => {
  const publicUrl = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!publicUrl) return null;
  try {
    const url = new URL(publicUrl);
    return url.hostname;
  } catch {
    return null;
  }
};

const r2Hostname = getR2Hostname();

const remotePatterns: Array<{ protocol?: "http" | "https"; hostname: string; port?: string; pathname?: string }> = [
  {
    protocol: "https",
    hostname: "*.r2.dev",
    pathname: "/**",
  },
  {
    protocol: "https",
    hostname: "*.cloudflarestorage.com",
    pathname: "/**",
  },
];

if (r2Hostname && !remotePatterns.some((p) => p.hostname === r2Hostname)) {
  remotePatterns.push({
    protocol: "https",
    hostname: r2Hostname,
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok.io", "localhost:3000"],
  transpilePackages: ["next-auth"],
  // Hide the bottom-left dev indicator / issue badge.
  // Note: runtime errors are still thrown, but the on-screen
  // indicator is disabled per user request.
  devIndicators: false,
  images: {
    remotePatterns,
  },
};

export default nextConfig;

