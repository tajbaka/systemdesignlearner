"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

/**
 * SSO Callback page handles OAuth redirects from providers like Google.
 *
 * This page has two mechanisms for redirecting users back to their original page:
 * 1. Clerk's built-in redirectUrlComplete (primary)
 * 2. sessionStorage backup (fallback if Clerk's redirect fails)
 *
 * The fallback is needed because sometimes Clerk's redirectUrlComplete can be lost
 * during the OAuth flow, causing users to be redirected to the fallback URL (/).
 */
export default function SSOCallbackPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [hasRedirected, setHasRedirected] = useState(false);

  // Fallback redirect using sessionStorage
  // This runs after Clerk's AuthenticateWithRedirectCallback completes
  useEffect(() => {
    if (!isLoaded || hasRedirected) return;

    // Only redirect if user is now signed in
    if (isSignedIn) {
      try {
        const returnUrl = sessionStorage.getItem("clerk_auth_return_url");
        if (returnUrl) {
          // Clear the stored URL
          sessionStorage.removeItem("clerk_auth_return_url");

          // Validate URL is from same origin to prevent open redirect
          const url = new URL(returnUrl);
          if (url.origin === window.location.origin) {
            setHasRedirected(true);
            // Small delay to ensure Clerk has finished processing
            setTimeout(() => {
              router.replace(returnUrl);
            }, 100);
            return;
          }
        }
      } catch {
        // sessionStorage might be unavailable or URL parsing failed
      }

      // If no valid return URL and we've been here for a bit, redirect to home
      // This handles the case where Clerk's redirect didn't work and we have no backup
      const timeout = setTimeout(() => {
        if (!hasRedirected) {
          setHasRedirected(true);
          router.replace("/");
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [isSignedIn, isLoaded, router, hasRedirected]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-zinc-400">Completing sign in...</p>
        <p className="text-zinc-500 text-xs mt-2">Redirecting you back...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
