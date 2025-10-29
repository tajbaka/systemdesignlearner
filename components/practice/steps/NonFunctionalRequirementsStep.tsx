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

export function NonFunctionalRequirementsStep() {
  const { state, setRequirements, isReadOnly } = usePracticeSession();
  const requirements = state.requirements;
  const nf = requirements.nonFunctional;

  const handleNumberChange = (key: "readRps" | "writeRps" | "p95RedirectMs", raw: string) => {
    const value = Number(raw);
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        [key]: Number.isFinite(value) ? value : 0,
      },
    });
  };

  const handleTextChange = (key: "rateLimitNotes" | "notes", value: string) => {
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        [key]: value,
      },
    });
  };

  const handleAvailabilityChange = (value: string) => {
    if (!["99.0", "99.9", "99.99"].includes(value)) return;
    setRequirements({
      ...requirements,
      nonFunctional: {
        ...nf,
        availability: value as typeof nf.availability,
      },
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              Step 2 · Non-functional guardrails
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-white sm:text-2xl">
                Performance & reliability targets
              </h2>
              <p className="text-sm leading-relaxed text-zinc-300">
                Anchor the design to latency, throughput, and availability goals. This drives down component choices later.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isReadOnly) return;
              console.info("Speech capture not yet implemented");
            }}
            disabled={isReadOnly}
            aria-label="Record your answer"
            className="hidden h-10 w-10 items-center justify-center rounded-full border border-blue-400/40 bg-blue-950/40 text-blue-200 transition hover:bg-blue-900/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
          >
            <MicIcon />
          </button>
        </header>
      </section>

      <section className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            <span className="font-semibold text-white">Latency target (P95, ms)</span>
            <input
              type="number"
              min={1}
              step={10}
              value={nf.p95RedirectMs}
              onChange={(event) => handleNumberChange("p95RedirectMs", event.target.value)}
              disabled={isReadOnly}
              className="h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            <span className="font-semibold text-white">Write throughput (requests / second)</span>
            <input
              type="number"
              min={1}
              step={10}
              value={nf.writeRps}
              onChange={(event) => handleNumberChange("writeRps", event.target.value)}
              disabled={isReadOnly}
              className="h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            <span className="font-semibold text-white">Read throughput (requests / second)</span>
            <input
              type="number"
              min={1}
              step={100}
              value={nf.readRps}
              onChange={(event) => handleNumberChange("readRps", event.target.value)}
              disabled={isReadOnly}
              className="h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-zinc-200">
            <span className="font-semibold text-white">Availability target</span>
            <select
              value={nf.availability}
              onChange={(event) => handleAvailabilityChange(event.target.value)}
              disabled={isReadOnly}
              className="h-12 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-base text-zinc-100 focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="99.0">99.0%</option>
              <option value="99.9">99.9%</option>
              <option value="99.99">99.99%</option>
            </select>
          </label>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-zinc-200">
              <span className="font-semibold text-white">Rate limit notes</span>
              <textarea
                value={nf.rateLimitNotes}
                onChange={(event) => handleTextChange("rateLimitNotes", event.target.value)}
                placeholder="Example: throttle to 5 writes / min per IP; burst tokens stored in Redis."
                disabled={isReadOnly}
                className="min-h-[100px] resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm text-zinc-200">
              <span className="font-semibold text-white">Other constraints</span>
              <textarea
                value={nf.notes}
                onChange={(event) => handleTextChange("notes", event.target.value)}
                placeholder="Example: comply with GDPR, prefer managed services, keep costs <$100 / month."
                disabled={isReadOnly}
                className="min-h-[100px] resize-y rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          </div>
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100">
            Tip: surface rate limits to clients early. Document burst limits alongside redirects-per-second to size your cache correctly.
          </div>
        </div>
      </section>
    </div>
  );
}

export default NonFunctionalRequirementsStep;
