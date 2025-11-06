"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { VoiceCaptureBridge } from "@/components/practice/VoiceCaptureBridge";

export function NonFunctionalRequirementsStep() {
  const { state, setRequirements, setStepScore, isReadOnly } = usePracticeSession();
  const requirements = state.requirements;
  const nf = requirements.nonFunctional;

  // Check if user has provided numeric values
  const hasNumericValues = nf.readRps > 0 && nf.writeRps > 0 && nf.p95RedirectMs > 0;
  const hasNotes = nf.notes.trim().length > 0;

  const handleSummaryChange = (summary: string) => {
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        notes: summary,
      },
    });
    // Clear the score when user changes their answer
    if (state.scores?.nonFunctional) {
      setStepScore("nonFunctional", undefined);
    }
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Describe the constraints
            </h3>
            {!hasNotes && !isReadOnly && (
              <span className="text-xs text-red-400">Required</span>
            )}
          </div>
          <div className={`relative rounded-2xl border ${
            !hasNotes && !isReadOnly
              ? 'border-red-500/50 bg-red-950/20'
              : 'border-zinc-700 bg-zinc-950/60'
          }`}>
            <textarea
              value={nf.notes}
              onChange={(event) => handleSummaryChange(event.target.value)}
              placeholder="Example: The system should handle high read volume with fast redirects (sub-second latency). Needs high availability with minimal downtime. Should scale horizontally for traffic spikes."
              className={`min-h-[200px] w-full resize-y rounded-2xl border-none bg-transparent px-4 pb-4 pr-14 pt-4 text-sm leading-6 text-zinc-100 placeholder:text-zinc-500 focus:outline-none ${
                !hasNotes && !isReadOnly
                  ? 'focus-visible:ring-2 focus-visible:ring-red-500'
                  : 'focus-visible:ring-2 focus-visible:ring-blue-500'
              }`}
              disabled={isReadOnly}
            />
            <div className="absolute bottom-3 right-3">
              <VoiceCaptureBridge
                value={nf.notes}
                onChange={handleSummaryChange}
                stepId="nonFunctional"
                disabled={isReadOnly}
              />
            </div>
          </div>

          {!hasNotes && !isReadOnly && (
            <p className="text-xs text-red-400">
              Please describe the performance constraints before continuing.
            </p>
          )}

          {hasNotes && !hasNumericValues && !isReadOnly && (
            <div className="rounded-lg border border-blue-500/30 bg-blue-950/20 p-3">
              <p className="text-xs text-blue-300">
                💡 <span className="font-semibold">Tip:</span> Consider adding specific numbers like &apos;100ms&apos; for latency or &apos;5000 RPS&apos; for throughput. Quantitative metrics help design more precisely.
              </p>
            </div>
          )}

        </div>
      </section>
    </div>
  );
}

export default NonFunctionalRequirementsStep;
