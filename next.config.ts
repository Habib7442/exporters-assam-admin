import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next's default is 1 MB, which the category image upload (also
      // capped at 1 MB) would already exceed once the multipart/form-data
      // overhead and the other form fields are added on top — same fix as
      // the storefront's own next.config.ts for the same reason.
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
