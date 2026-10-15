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
const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_BASE_URL || (MEDIA_HOST ? `https://${MEDIA_HOST}` : "");

// The image host is derived from the effective base URL so next/image always allows what mediaUrl produces.
function imageHost(base) {
  try {
    return base ? new URL(base).hostname : null;
  } catch {
    return null;
  }
}

const IMAGE_HOST = imageHost(MEDIA_BASE_URL);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MEDIA_BASE_URL: MEDIA_BASE_URL,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(IMAGE_HOST ? [{ protocol: "https", hostname: IMAGE_HOST }] : []),
    ],
  },
  experimental: {
    // The OG card routes read their font files at runtime; make sure the server bundle includes them.
    outputFileTracingIncludes: {
      "/invitation/[slug]/card": ["./src/InvitationModule/og/fonts/**"],
      "/api/og/invitation-preview": ["./src/InvitationModule/og/fonts/**"],
    },
  },
  webpack(config) {
    // The staff guide in docs/ is bundled into /admin/help as a string.
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
};

module.exports = nextConfig;
