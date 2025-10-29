"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { track } from "@/lib/analytics";

export function AuthGateStep() {
  const { state, setAuth, isReadOnly } = usePracticeSession();
  const { isAuthed, skipped } = state.auth;

  const handleAuth = (provider: "google" | "email") => {
    if (isReadOnly) return;
    setAuth((prev) => ({ ...prev, isAuthed: true, skipped: false }));
    track("practice_auth_attempted", { slug: state.slug, provider });
  };

  const handleSkip = () => {
    if (isReadOnly) return;
    setAuth((prev) => ({ ...prev, skipped: true }));
    track("practice_auth_skipped", { slug: state.slug });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
            Step 5 · Save progress
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">
              Sign in to keep your run history
            </h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Store your design, unlock daily streaks, and share a verified pass badge. You can skip for now and keep practicing locally.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:gap-5">
          <button
            type="button"
            onClick={() => handleAuth("google")}
            disabled={isReadOnly || isAuthed}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/20 bg-white/5 px-6 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-blue-600 font-bold">
              G
            </span>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleAuth("email")}
            disabled={isReadOnly || isAuthed}
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-blue-400/40 bg-blue-500/10 px-6 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Continue with Email
          </button>

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

          {(isAuthed || skipped) ? (
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
              {isAuthed ? "Great! Your progress will sync when you run again." : "Skip recorded. You can sign in later from the score screen."}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default AuthGateStep;
