/**
 * Get the base URL for absolute paths (required for OG images and share links)
 * @returns The base URL with protocol and domain
 */
export function getBaseUrl(): string {
  // In production, use the canonical domain
  if (process.env.VERCEL_ENV === "production") {
    return "https://www.systemdesignsandbox.com";
  }
  // For preview/development, use NEXT_PUBLIC_VERCEL_URL if available
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return process.env.NEXT_PUBLIC_VERCEL_URL.startsWith("http")
      ? process.env.NEXT_PUBLIC_VERCEL_URL
      : `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  // Fallback for local development
  return "http://localhost:3000";
}
