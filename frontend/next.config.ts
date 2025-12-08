import type { NextConfig } from "next";
/** @type {import('next').NextConfig} */

const nextConfig: NextConfig = {
  experimental: {
    appDir: false,   // ❗ บังคับปิด App Router
  },
};

export default nextConfig;
