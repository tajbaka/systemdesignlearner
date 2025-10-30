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

export function AuthModal({ isOpen, onClose, onAuthenticated, slug }: AuthModalProps) {
  const { isSignedIn, user } = useUser();

  // Automatically call onAuthenticated when user signs in
  useEffect(() => {
    if (isSignedIn && user && isOpen) {
      track("practice_auth_completed", {
        slug,
        provider: "clerk",
        userId: user.id
      });
      onAuthenticated();
    }
  }, [isSignedIn, user, isOpen, onAuthenticated, slug]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        {/* No close button - user must authenticate */}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              Save progress
            </div>
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Sign in to see your results! 🎉
            </h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              You&apos;ve passed the simulation! Sign in to view your score, save your progress, and share your verified pass badge.
            </p>
          </div>

          {isSignedIn ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              ✓ You&apos;re signed in as {user?.primaryEmailAddress?.emailAddress}. Your progress will be saved!
            </div>
          ) : (
            <>
              <div className="flex justify-center py-4">
                <SignIn
                  routing="hash"
                  appearance={{
                    elements: {
                      rootBox: "mx-auto",
                      card: "bg-zinc-900/70 border-zinc-800",
                    }
                  }}
                />
              </div>

              <p className="text-center text-xs text-zinc-500">
                Create an account to view your results and save your progress.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
