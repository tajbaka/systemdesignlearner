"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { SCENARIOS } from "@/lib/scenarios";

export function URLShortenerIntroClient() {
  const router = useRouter();
  const scenario = SCENARIOS.find((s) => s.id === "url-shortener")!;

  const handleStartPractice = () => {
    track("practice_intro_start", {
      slug: "url-shortener",
    });
    router.push("/practice/url-shortener");
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <Link
          href="/practice"
          className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          ← Back
        </Link>
      </header>

      {/* Content - Centered */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-3xl space-y-8">
          <div className="space-y-8">
            {/* Problem */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Problem</p>
              <h1 className="text-4xl font-bold text-white sm:text-5xl">{scenario.title}</h1>
            </div>

            {/* Metadata Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 text-sm font-medium rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                {scenario.category}
              </span>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-md border ${
                  scenario.difficulty === "easy"
                    ? "bg-green-500/10 text-green-300 border-green-500/20"
                    : scenario.difficulty === "medium"
                      ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                      : "bg-red-500/10 text-red-300 border-red-500/20"
                }`}
              >
                {scenario.difficulty}
              </span>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                Description
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed sm:text-xl">
                {scenario.description}
              </p>
            </div>
          </div>

          {/* Start Practice Button - Right aligned */}
          <div className="flex justify-end items-center gap-4 pt-4">
            {scenario.estimatedTime && (
              <p className="text-sm text-zinc-500">{scenario.estimatedTime}</p>
            )}
            <Button
              size="lg"
              onClick={handleStartPractice}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all px-8 min-h-[48px] text-base"
            >
              Start Practice
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
