import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * SSO Callback page handles OAuth redirects from providers like Google.
 *
 * Flow:
 * 1. Google redirects here after OAuth
 * 2. Clerk completes authentication and sets session cookies
 * 3. Clerk automatically redirects to redirectUrlComplete (original page)
 * 4. Session initialization happens on the original page via useAuthentication
 */
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
