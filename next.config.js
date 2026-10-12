const fs = require("fs");
const path = require("path");

// Each environment (sandbox, preview branch, production) has its own bucket; its name comes from amplify_outputs.json.
function mediaHost() {
  try {
    const outputs = JSON.parse(fs.readFileSync(path.join(__dirname, "amplify_outputs.json"), "utf8"));
    const bucket = outputs.storage?.bucket_name;
    const region = outputs.storage?.aws_region;
    return bucket && region ? `${bucket}.s3.${region}.amazonaws.com` : null;
  } catch {
    return null;
  }
}

const MEDIA_HOST = mediaHost();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MEDIA_BASE_URL: process.env.NEXT_PUBLIC_MEDIA_BASE_URL || (MEDIA_HOST ? `https://${MEDIA_HOST}` : ""),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(MEDIA_HOST ? [{ protocol: "https", hostname: MEDIA_HOST }] : []),
    ],
  },
  webpack(config) {
    // The staff guide in docs/ is bundled into /admin/help as a string.
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

module.exports = nextConfig;
