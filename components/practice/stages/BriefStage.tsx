"use client";

import ReqForm from "../ReqForm";
import type { Requirements } from "@/lib/practice/types";
import { track } from "@/lib/analytics";

type BriefStageProps = {
  slug?: string;
  value: Requirements;
  locked: boolean;
  onChange: (value: Requirements) => void;
  onComplete: (value: Requirements) => void;
  readOnly?: boolean;
};

const INTRO_POINTS = [
  "Handle 5k redirect reads per second with a P95 latency budget of 100 ms.",
  "Use cache to keep the database off the hot path for common slugs.",
  "Design for optional scope like custom aliases and click analytics.",
];

export default function BriefStage({
  slug = "url-shortener",
  value,
  locked,
  onChange,
  onComplete,
  readOnly = false,
}: BriefStageProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
            Phase 1 · Guided brief
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white sm:text-2xl">URL Shortener</h2>
            <p className="text-sm text-zinc-300 leading-relaxed">
              You are shipping a fast redirect service. We pre-loaded the baseline goals—check the
              toggles, tweak the targets, and lock in the brief to start designing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-blue-100 lg:flex-nowrap">
            {INTRO_POINTS.map((point) => (
              <span
                key={point}
                className="rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-blue-100 whitespace-normal sm:whitespace-nowrap"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end" />
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 space-y-6">
        <ReqForm
          value={value}
          locked={locked}
          onChange={onChange}
          onContinue={(next) => {
            onComplete(next);
            track("practice_brief_locked", {
              slug,
              custom_alias: next.functional["custom-alias"],
              analytics: next.functional["basic-analytics"],
            });
          }}
          readOnly={readOnly}
        />
      </section>
    </div>
  );
}
