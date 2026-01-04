"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallbackPage() {
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
