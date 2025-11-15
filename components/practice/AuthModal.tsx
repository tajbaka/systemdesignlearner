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
      {isSignedIn ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100 mx-4">
          ✓ You&apos;re signed in as {user?.primaryEmailAddress?.emailAddress}. Your progress will be saved!
        </div>
      ) : (
        <SignIn
          routing="hash"
          forceRedirectUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          fallbackRedirectUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          appearance={{
            elements: {
              rootBox: "mx-auto",
              cardBox: {
                boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
                border: "2px solid rgb(82 82 91)",
              },
              card: {
                boxShadow: "none",
              }
            }
          }}
        />
      )}
    </div>
  );
}

export default AuthModal;
