"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect } from "react";

export default function SSOCallbackPage() {
  useEffect(() => {
    // Track that user completed OAuth flow
    console.log("[SSO Callback] Processing OAuth redirect...");
    console.log(
      "[SSO Callback] Current URL:",
      typeof window !== "undefined" ? window.location.href : "N/A"
    );
  }, []);

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
