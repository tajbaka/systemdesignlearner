"use client";

import React from "react";

interface AuthModalDialogProps {
  isOpen: boolean;
  isSignedIn: boolean;
  userEmail?: string;
  email: string;
  code: string;
  step: "start" | "verify";
  isLoading: boolean;
  isGoogleLoading: boolean;
  error: string;
  isLoaded: boolean;
  onEmailChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onEmailSubmit: (e: React.FormEvent) => void;
  onCodeVerify: (e: React.FormEvent) => void;
  onGoogleSignIn: () => void;
  onClose?: () => void;
  onBack: () => void;
}

export function AuthModalDialog({
  isOpen,
  isSignedIn,
  userEmail,
  email,
  code,
  step,
  isLoading,
  isGoogleLoading,
  error,
  isLoaded,
  onEmailChange,
  onCodeChange,
  onEmailSubmit,
  onCodeVerify,
  onGoogleSignIn,
  onClose,
  onBack,
}: AuthModalDialogProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {isSignedIn ? (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100 mx-4 relative">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-emerald-300 hover:text-emerald-100 transition-colors"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          ✓ You&apos;re signed in as {userEmail}. Your progress will be saved!
        </div>
      ) : (
        <div className="flex flex-col items-center max-w-md w-full">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8 w-full shadow-2xl relative">
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            {step === "start" ? (
              <>
                {/* Custom header */}
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-white mb-2">Save your progress</h2>
                  <p className="text-zinc-400 text-sm">
                    Sign in or create an account to save your practice session and track your
                    scores.
                  </p>
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  disabled={isGoogleLoading || isLoading || !isLoaded}
                  className="w-full flex items-center justify-center gap-3 bg-white text-gray-900 rounded-lg px-4 py-3 font-medium hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  {isGoogleLoading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent"></div>
                      Redirecting to Google...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>

                {/* Separator */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-zinc-900 text-zinc-500">Or continue with email</span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={onEmailSubmit}>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => onEmailChange(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={isLoading || isGoogleLoading}
                    />
                  </div>

                  {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

                  <button
                    type="submit"
                    disabled={isLoading || isGoogleLoading || !isLoaded || !email}
                    className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Sending code..." : "Continue with Email"}
                  </button>

                  <p className="mt-3 text-xs text-zinc-500 text-center">
                    New to the platform? An account will be created automatically.
                  </p>
                </form>
              </>
            ) : (
              <>
                {/* Verification Step */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-white mb-2">Check your email</h3>
                  <p className="text-zinc-400 text-sm">
                    We sent a verification code to <span className="text-white">{email}</span>
                  </p>
                </div>

                <form onSubmit={onCodeVerify}>
                  <div className="mb-4">
                    <label htmlFor="code" className="block text-sm font-medium text-zinc-300 mb-2">
                      Verification code
                    </label>
                    <input
                      id="code"
                      type="text"
                      value={code}
                      onChange={(e) => onCodeChange(e.target.value)}
                      placeholder="Enter code"
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>

                  {error && <div className="mb-4 text-sm text-red-400">{error}</div>}

                  <button
                    type="submit"
                    disabled={isLoading || !isLoaded || !code}
                    className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                  >
                    {isLoading ? "Verifying..." : "Verify"}
                  </button>

                  <button
                    type="button"
                    onClick={onBack}
                    className="w-full text-zinc-400 hover:text-zinc-300 text-sm transition"
                  >
                    ← Back to sign in
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
