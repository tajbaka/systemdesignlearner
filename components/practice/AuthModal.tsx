"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  slug: string;
}

export function AuthModal({ isOpen, onClose: _onClose, onAuthenticated, slug }: AuthModalProps) {
  const { isSignedIn, user } = useUser();

  // Automatically call onAuthenticated when user signs in
  useEffect(() => {
    if (isSignedIn && user && isOpen) {
      console.log("[AuthModal] User authenticated, calling onAuthenticated");
      track("practice_auth_completed", {
        slug,
        provider: "clerk",
        userId: user.id
      });
      // Small delay to ensure Clerk state is fully settled
      setTimeout(() => {
        onAuthenticated();
      }, 100);
    }
  }, [isSignedIn, user, isOpen, onAuthenticated, slug]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        {/* No close button - user must authenticate */}

        <div className="space-y-4">
          {isSignedIn ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              ✓ You&apos;re signed in as {user?.primaryEmailAddress?.emailAddress}. Your progress will be saved!
            </div>
          ) : (
            <>
              <h2 className="text-center text-xl font-semibold text-white sm:text-2xl mb-4">
                Congrats! 🎉
              </h2>
              <div className="flex justify-center">
                <SignIn
                  routing="hash"
                  forceRedirectUrl={typeof window !== 'undefined' ? window.location.href : undefined}
                  fallbackRedirectUrl={typeof window !== 'undefined' ? window.location.href : undefined}
                  appearance={{
                    elements: {
                      rootBox: "mx-auto",
                      card: "bg-zinc-900/70 border-zinc-800",
                    }
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
