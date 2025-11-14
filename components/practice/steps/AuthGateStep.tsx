"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { track } from "@/lib/analytics";
import { SignIn, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export function AuthGateStep() {
  const { state, setAuth, isReadOnly } = usePracticeSession();
  const { isAuthed, skipped } = state.auth;
  const { isSignedIn, user } = useUser();

  // Automatically mark as authenticated when user signs in via Clerk
  useEffect(() => {
    if (isSignedIn && user && !isAuthed) {
      setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
      track("practice_auth_completed", {
        slug: state.slug,
        provider: "clerk",
        userId: user.id
      });
    }
  }, [isSignedIn, user, isAuthed, setAuth, state.slug]);

  const handleSkip = () => {
    if (isReadOnly) return;
    setAuth((prev) => ({ ...prev, skipped: true }));
    track("practice_auth_skipped", { slug: state.slug });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
            Step 5 · Save progress
          </div>
          <div className="space-y-2">
            <h2 className="hidden text-xl font-semibold text-white sm:block sm:text-2xl">
              URL Shortener
            </h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Store your design, unlock daily streaks, and share a verified pass badge. You can skip for now and keep practicing locally.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
        <div className="flex flex-col gap-4 sm:gap-5">
          {isSignedIn ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
              Great! You&apos;re signed in as {user?.primaryEmailAddress?.emailAddress}. Your progress will be saved.
            </div>
          ) : (
            <div className="flex justify-center">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "mx-auto",
                    card: "bg-zinc-900/70 border-zinc-800",
                  }
                }}
              />
            </div>
          )}

          {!isSignedIn && (
            <>
              <p className="text-xs text-zinc-500">
                We&apos;ll store your practice progress securely. No spam — just reminders for fresh drills.
              </p>

              <button
                type="button"
                onClick={handleSkip}
                disabled={isReadOnly}
                className="self-start text-xs font-semibold text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Skip for now
              </button>
            </>
          )}

          {skipped && !isSignedIn && (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
              Skip recorded. You can sign in later from the score screen.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AuthGateStep;
