import path from "path";
import { withPostHogConfig } from "@posthog/nextjs-config";
import type { NextConfig } from "next";

const isCI = Boolean(process.env.CI);

const nextConfig: NextConfig = {
  devIndicators: false,
  // Explicitly disable trailing slashes so all canonical URLs are /path (not /path/)
  trailingSlash: false,
  // Allow browsers to report full error details for cross-origin scripts (fixes "Script error.")
  crossOrigin: "anonymous",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
    ],
  },
  webpack(config, { dev }) {
    // Avoid webpack persisting very large serialized strings to disk while keeping repeat builds fast.
    // Use an in-memory cache in dev for responsiveness and fall back to the filesystem cache for production builds.
    config.cache = dev ? { type: "memory" } : { type: "filesystem" };

    if (!dev) {
      config.module?.rules?.push({
        test: /node_modules[\\/]lucide-react[\\/]dist[\\/]esm[\\/]icons[\\/].*\\.js$/,
        use: [
          {
            loader: path.resolve(__dirname, "scripts/strip-sourcemap-comment-loader.js"),
          },
        ],
      });
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  outputFileTracingRoot: __dirname,

  // PostHog proxy: use /ph (not /ingest) so ad blockers are less likely to block by path
  async rewrites() {
    const rewrites = [
      {
        source: "/ph/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ph/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
    return rewrites;
  },

  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,

  // Canonical URL redirects for SEO
  async redirects() {
    return [
      // Redirect non-www to www
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "systemdesignsandbox.com",
          },
        ],
        destination: "https://www.systemdesignsandbox.com/:path*",
        permanent: true,
      },
      // Clean up ghost URLs that Google has crawled as 404
      { source: "/examples", destination: "/practice", permanent: true },
      { source: "/interview-guide", destination: "/learn/introduction", permanent: true },
      { source: "/docs", destination: "/", permanent: true },
    ];
  },
};

// PostHog sourcemap upload: only enable when both the API key and environment ID are present
const hasPostHogSourcemapKeys =
  Boolean(process.env.POSTHOG_PERSONAL_API_KEY) && Boolean(process.env.POSTHOG_ENV_ID);

const withPostHog = withPostHogConfig(nextConfig, {
  personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY ?? "",
  envId: process.env.POSTHOG_ENV_ID ?? "",
  host: "https://us.i.posthog.com",
  sourcemaps: {
    enabled: isCI && hasPostHogSourcemapKeys,
    deleteAfterUpload: true,
  },
});

export default withPostHog;
