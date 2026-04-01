const isServer = typeof window === "undefined";

/**
 * Get the base URL for absolute paths (required for OG images, share links, and server-side fetch)
 * @returns The base URL with protocol and domain, or empty string for client-side relative URLs
 */
export function getBaseUrl(): string {
  if (isServer) {
    // In production, use the canonical domain
    if (process.env.VERCEL_ENV === "production") {
      return "https://www.systemdesignlearner.com";
    }

    // Check for Vercel deployment URL
    const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL;

    if (vercelUrl) {
      if (vercelUrl.includes("localhost")) {
        // Extract port from localhost URL (e.g., 'localhost:3000' or just 'localhost')
        const port = vercelUrl.includes(":") ? vercelUrl.split(":")[1] : "3000";
        return `http://localhost:${port}`;
      }
      // For Vercel preview deployments
      return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
    }

    // Fallback for local development
    return "http://localhost:3000";
  }

  // Client-side: use relative URLs for same-origin requests
  return "";
}
