"use client";

type VerificationFeedbackProps = {
  blocking: string[];
  warnings: string[];
  onRevise: () => void;
  onContinue?: () => void;
};

export function VerificationFeedback({
  blocking,
  warnings,
  onRevise,
  onContinue,
}: VerificationFeedbackProps) {
  const hasBlocking = blocking.length > 0;
  const hasWarnings = warnings.length > 0;

  if (!hasBlocking && !hasWarnings) {
    return null;
  }

  return (
    <div className="animate-slide-down overflow-hidden">
      <div
        className={`rounded-2xl border p-4 ${
          hasBlocking
            ? "border-rose-400/40 bg-rose-500/10"
            : "border-amber-400/40 bg-amber-500/10"
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {hasBlocking ? (
              <svg className="h-5 w-5 text-rose-300" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-amber-300" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <h3
              className={`text-sm font-semibold ${
                hasBlocking ? "text-rose-100" : "text-amber-100"
              }`}
            >
              {hasBlocking ? "❌ Required improvements" : "⚠️ Suggestions for improvement"}
            </h3>

            <ul className={`space-y-1 text-sm ${hasBlocking ? "text-rose-200" : "text-amber-200"}`}>
              {blocking.map((item, index) => (
                <li key={`blocking-${index}`} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
              {warnings.map((item, index) => (
                <li key={`warning-${index}`} className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onRevise}
                className={`inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 ${
                  hasBlocking
                    ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 focus-visible:ring-rose-400"
                    : "bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 focus-visible:ring-amber-400"
                }`}
              >
                Revise
              </button>

              {!hasBlocking && onContinue ? (
                <button
                  type="button"
                  onClick={onContinue}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  Continue Anyway
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M4 2l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerificationFeedback;
