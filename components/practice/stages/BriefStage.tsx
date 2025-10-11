"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ReqForm from "../ReqForm";
import type { Requirements } from "@/lib/practice/types";
import { track } from "@/lib/analytics";

type BriefStageProps = {
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
  value,
  locked,
  onChange,
  onComplete,
  readOnly = false,
}: BriefStageProps) {
  const [showIntro, setShowIntro] = useState(!locked);

  useEffect(() => {
    if (showIntro) {
      track("practice_brief_intro_opened", { slug: "url-shortener" });
    }
  }, [showIntro]);

  useEffect(() => {
    if (locked) {
      setShowIntro(false);
    }
  }, [locked]);

  const nonFunctionalSummary = useMemo(() => {
    const targets = value.nonFunctional;
    return [
      `${targets.readRps.toLocaleString()} redirect reads/sec`,
      `${targets.writeRps.toLocaleString()} short link writes/sec`,
      `P95 redirect < ${targets.p95RedirectMs} ms`,
      `${targets.availability}% availability`,
    ];
  }, [value.nonFunctional]);

  return (
    <div className="relative">
      <AnimatePresence>
        {showIntro ? (
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="brief-intro-title"
          >
            <motion.div
              className="w-full max-w-xl rounded-3xl border border-zinc-700 bg-zinc-900/95 p-6 shadow-2xl sm:p-8"
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <header className="mb-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
                  Phase 1 · Guided brief
                </span>
                <h2 id="brief-intro-title" className="mt-3 text-2xl font-semibold text-white">
                  URL Shortener MVP
                </h2>
                <p className="mt-2 text-sm text-zinc-300 leading-relaxed">
                  You are shipping a fast redirect service. We pre-loaded the baseline goals—check the toggles, tweak the targets, and lock in the brief to start designing.
                </p>
              </header>
              <ul className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-200">
                {INTRO_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setShowIntro(false);
                  track("practice_brief_intro_dismissed", { slug: "url-shortener" });
                }}
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Start Brief
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className={`${showIntro ? "opacity-20 pointer-events-none" : "opacity-100"} transition-opacity`}>
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 space-y-6">
          <header className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Brief</h2>
                <p className="text-sm text-zinc-400">
                  Confirm the scope before we step into the sandbox. Everything saves locally so you can iterate freely.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300">
                <span className="font-semibold text-zinc-100">Targets:</span>{" "}
                {nonFunctionalSummary.join(" · ")}
              </div>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
              Tip: Toggle “Custom alias” or “Basic analytics” to see how the design prompts evolve later.
            </div>
          </header>

          <ReqForm
            value={value}
            locked={locked}
            onChange={onChange}
            onContinue={(next) => {
              onComplete(next);
              track("practice_brief_locked", {
                slug: "url-shortener",
                custom_alias: next.functional["custom-alias"],
                analytics: next.functional["basic-analytics"],
              });
            }}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
