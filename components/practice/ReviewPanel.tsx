"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeDesign as encodeShare } from "@/lib/shareLink";
import { track } from "@/lib/analytics";
import type { PracticeState } from "@/lib/practice/types";

type ReviewPanelProps = {
  state: PracticeState;
  readOnly?: boolean;
};

const FUNCTIONAL_ITEMS: Array<{ id: keyof PracticeState["requirements"]["functional"]; label: string }> = [
  { id: "create-short-url", label: "Create short URLs" },
  { id: "redirect-by-slug", label: "Redirect by slug" },
  { id: "custom-alias", label: "Custom aliases" },
  { id: "basic-analytics", label: "Click analytics" },
  { id: "rate-limiting", label: "Rate limiting" },
  { id: "admin-delete", label: "Admin delete" },
];

const buildHints = (state: PracticeState): string[] => {
  const result = state.run.lastResult;
  if (!result) return [];
  const hints: string[] = [];

  if (result.failedByChaos) {
    hints.push("Chaos failures detected — add redundancy (LB/API GW) or harden cache path.");
  }
  if (!result.meetsLatency) {
    hints.push("Latency miss — ensure Redis sits before Postgres and avoid extra network hops.");
  }
  if (!result.meetsRps) {
    hints.push("Throughput miss — scale the service horizontally or add a load balancer.");
  }
  if (result.acceptanceResults) {
    Object.entries(result.acceptanceResults).forEach(([id, ok]) => {
      if (ok) return;
      switch (id) {
        case "cache-present":
          hints.push("Add Redis cache on the redirect hot path.");
          break;
        case "lb-service":
          hints.push("Place an API gateway or load balancer in front of the service.");
          break;
        default:
          hints.push(`Acceptance unmet: ${id}`);
      }
    });
  }
  if (state.requirements.functional["basic-analytics"]) {
    const hasQueue = result.acceptanceResults?.analytics ?? false;
    if (!hasQueue) {
      hints.push("Stream analytics via queue/worker so redirects stay async.");
    }
  }

  return Array.from(new Set(hints));
};

type SandboxSharePayload = {
  scenarioId: PracticeState["slug"];
  nodes: Array<{
    id: string;
    kind: string;
    x: number;
    y: number;
    replicas?: number;
    customLabel?: string;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    linkLatencyMs: number;
    sourceHandle?: string;
    targetHandle?: string;
  }>;
};

const buildSandboxSharePayload = (state: PracticeState): SandboxSharePayload => ({
  scenarioId: state.slug,
  nodes: state.design.nodes.map((node) => ({
    id: node.id,
    kind: node.spec.kind,
    x: node.x,
    y: node.y,
    replicas: node.replicas,
    customLabel: node.customLabel,
  })),
  edges: state.design.edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    linkLatencyMs: edge.linkLatencyMs,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  })),
});

export const ReviewPanel = ({
  state,
  readOnly = false,
}: ReviewPanelProps) => {
  const lastResult = state.run.lastResult;
  const score = lastResult?.scoreBreakdown;
  const outcome =
    score?.outcome ?? (lastResult?.failedByChaos ? "chaos_fail" : undefined);
  const hints = useMemo(() => buildHints(state), [state]);
  const sandboxShare = useMemo(() => buildSandboxSharePayload(state), [state]);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "error">("idle");

  useEffect(() => {
    if (score) {
      track("practice_score_viewed", {
        slug: state.slug,
        score: score.totalScore,
        outcome: score.outcome,
        attempts: state.run.attempts,
      });
    }
  }, [score, state.slug, state.run.attempts]);

  useEffect(() => {
    if (shareStatus === "idle") return;
    const timer = window.setTimeout(() => setShareStatus("idle"), 3000);
    return () => window.clearTimeout(timer);
  }, [shareStatus]);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play?s=${encodeShare(sandboxShare)}`
      : "";

  const handleShare = () => {
    if (!shareUrl) return;
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        track("practice_shared", {
          slug: state.slug,
          score: score?.totalScore ?? 0,
          destination: "sandbox",
        });
        setShareStatus("copied");
      })
      .catch((error) => {
        console.error("Failed to copy share link", error);
        setShareStatus("error");
      });
  };

  const shareButtonClass =
    shareStatus === "copied"
      ? "inline-flex items-center gap-2 rounded-full border border-blue-400 px-4 py-2 text-xs font-semibold text-white bg-blue-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
      : "inline-flex items-center gap-2 rounded-full border border-blue-400/40 px-4 py-2 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400";

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-6 space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Review</h2>
            <p className="text-sm text-zinc-400">
              Final metrics and notes from your latest passing run. Share a sandbox link or review the highlights below.
            </p>
          </div>
          {score ? (
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                outcome === "pass"
                  ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                  : outcome === "partial"
                  ? "border border-amber-400/40 bg-amber-500/15 text-amber-100"
                  : "border border-rose-400/40 bg-rose-500/20 text-rose-100"
              }`}
            >
              {outcome ? outcome : "pending"} · {score.totalScore}/100
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Run required
            </span>
          )}
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Requirements
            </h3>
            <ul className="space-y-2 text-sm text-zinc-200">
              {FUNCTIONAL_ITEMS.map((item) => (
                <li key={item.id} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`h-2 w-2 rounded-full ${
                      state.requirements.functional[item.id]
                        ? "bg-emerald-400"
                        : "bg-zinc-600"
                    }`}
                  />
                  <span className="flex-1">{item.label}</span>
                  <span className="text-xs text-zinc-500">
                    {state.requirements.functional[item.id] ? "Enabled" : "Deferred"}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="grid grid-cols-2 gap-2 pt-2 text-xs text-zinc-400">
              <div>
                <dt className="uppercase tracking-wide">Read RPS</dt>
                <dd className="text-zinc-100">
                  {state.requirements.nonFunctional.readRps.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Write RPS</dt>
                <dd className="text-zinc-100">
                  {state.requirements.nonFunctional.writeRps.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">P95 latency</dt>
                <dd className="text-zinc-100">
                  {state.requirements.nonFunctional.p95RedirectMs} ms
                </dd>
              </div>
              <div>
                <dt className="uppercase tracking-wide">Availability</dt>
                <dd className="text-zinc-100">
                  {state.requirements.nonFunctional.availability}%
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Simulation
            </h3>
            {lastResult ? (
              <dl className="space-y-2 text-sm text-zinc-200">
                <div className="flex items-center justify-between">
                  <dt>P95 latency</dt>
                  <dd className={lastResult.meetsLatency ? "text-emerald-300" : "text-rose-300"}>
                    {lastResult.latencyMsP95} ms
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Capacity</dt>
                  <dd className={lastResult.meetsRps ? "text-emerald-300" : "text-rose-300"}>
                    {lastResult.capacityRps.toLocaleString()} rps
                  </dd>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <dt>Backlog growth</dt>
                  <dd>{lastResult.backlogGrowthRps.toLocaleString()} rps</dd>
                </div>
                {score ? (
                  <div className="grid grid-cols-3 gap-3 text-xs text-zinc-300 pt-2">
                    <div>
                      <dt className="uppercase tracking-wide">SLO</dt>
                      <dd>{score.sloScore}/60</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide">Requirements</dt>
                      <dd>{score.checklistScore}/30</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-wide">Efficiency</dt>
                      <dd>{score.costScore}/10</dd>
                    </div>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-zinc-400">
                Run the simulator to populate metrics and shareable score.
              </p>
            )}

            {hints.length > 0 ? (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100 space-y-1">
                <div className="font-semibold uppercase tracking-wide">Improvements</div>
                <ul className="space-y-1 leading-relaxed">
                  {hints.map((hint) => (
                    <li key={hint} className="flex gap-2">
                      <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-200" />
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
              Share your sandbox
            </h3>
            <p className="text-xs text-zinc-500">
              Copy a link that recreates this scenario, layout, connections, and replicas directly in the sandbox.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleShare}
              className={shareButtonClass}
            >
              {shareStatus === "copied" ? "Link copied!" : "Copy share link"}
            </button>
          </div>
          {shareStatus === "error" ? (
            <p className="text-xs text-rose-300">Copy failed. Try again or share manually.</p>
          ) : null}
        </header>
        <dl className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-300 sm:grid-cols-2">
          <div>
            <dt className="uppercase tracking-wide text-zinc-400">Scenario</dt>
            <dd className="text-zinc-100">{state.slug}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-wide text-zinc-400">Nodes</dt>
            <dd className="text-zinc-100">{sandboxShare.nodes.length}</dd>
          </div>
          <div className="sm:col-span-2 text-zinc-400">
            The copied link opens in the sandbox so others can inspect the board exactly as you arranged it.
          </div>
        </dl>
      </section>
    </div>
  );
};

export default ReviewPanel;
