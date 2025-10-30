"use client";

import { usePracticeSession } from "@/components/practice/session/PracticeSessionProvider";
import { VoiceCaptureBridge } from "@/components/practice/VoiceCaptureBridge";

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
            <div className="absolute bottom-3 right-3">
              <VoiceCaptureBridge
                value={requirements.functionalSummary}
                onChange={handleSummaryChange}
                stepId="functional"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default FunctionalRequirementsStep;
