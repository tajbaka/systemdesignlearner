"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";

const MicIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden fill="none">
    <path
      d="M12 3a2 2 0 0 0-2 2v6a2 2 0 1 0 4 0V5a2 2 0 0 0-2-2Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19 11a7 7 0 0 1-14 0M12 21v-3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function FunctionalRequirementsStep() {
  const { state, setRequirements, isReadOnly } = usePracticeSession();
  const requirements = state.requirements;

  const handleSummaryChange = (summary: string) => {
    setRequirements({
      ...requirements,
      functionalSummary: summary,
    });
  };

  return (
    <div className="space-y-6">
      <div className="px-4 text-center sm:px-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white sm:text-2xl">
            URL Shortener
          </h2>
        </div>
      </div>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 lg:mx-auto lg:max-w-3xl">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
            What should it do?
          </h3>
          <div className="relative rounded-2xl border border-zinc-700 bg-zinc-950/60">
            <textarea
              value={requirements.functionalSummary}
              onChange={(event) => handleSummaryChange(event.target.value)}
              placeholder="Example: shorten URLs, redirect by slug, allow optional custom aliases and view counts."
              className="min-h-[200px] w-full resize-y rounded-2xl border-none bg-transparent px-4 pb-4 pr-14 pt-4 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              disabled={isReadOnly}
            />
            <button
              type="button"
              onClick={() => {
                if (isReadOnly) return;
                console.info("Speech capture not yet implemented");
              }}
              disabled={isReadOnly}
              aria-label="Record your answer"
              className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-400/40 bg-blue-950/40 text-blue-200 transition hover:bg-blue-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MicIcon />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FunctionalRequirementsStep;
