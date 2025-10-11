"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { Navbar } from "@/components/Navbar";

const PROBLEMS = [
  {
    slug: "url-shortener",
    name: "URL Shortener",
    difficulty: "Easy",
    topic: "Storage & Caching",
    description: "Single short link MVP",
    estimatedTime: "15-20 min",
  },
];

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />
      <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 py-8 sm:px-6 md:gap-10 md:py-12 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <header className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
              Guided tracks
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white sm:text-4xl">
                System design practice
              </h1>
              <p className="mt-2 text-sm text-zinc-300 sm:text-base sm:leading-relaxed">
                Tackle curated drills with a friendly walkthrough, then jump straight into the sandbox to validate your architecture.
              </p>
            </div>
          </header>
          <div className="w-full max-w-md space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 md:max-w-xs md:space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Upcoming
            </p>
            <div>
              <label htmlFor="practice-search" className="text-sm text-zinc-400">
                Search tracks (coming soon)
              </label>
              <input
                id="practice-search"
                type="search"
                disabled
                className="mt-2 h-11 w-full rounded-full border border-dashed border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-500 min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder="Filter problems"
              />
            </div>
            <p className="text-xs text-zinc-500">
              Looking for something specific? Drop a request on{" "}
              <Link href="/feedback" className="text-blue-200 underline-offset-2 hover:underline">
                feedback
              </Link>.
            </p>
          </div>
        </div>

        {/* Problems Grid */}
        <div className="grid gap-4 sm:gap-6">
          {PROBLEMS.map((problem) => (
            <div
              key={problem.slug}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 sm:p-6 hover:border-zinc-600 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                {/* Problem Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white sm:text-xl">
                      {problem.name}
                    </h3>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        problem.difficulty === 'Easy'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : problem.difficulty === 'Medium'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-400 mb-3 leading-relaxed">
                    {problem.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Topic:</span>
                      <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">
                        {problem.topic}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Time:</span>
                      <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">
                        {problem.estimatedTime}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <Link
                    href={`/practice/${problem.slug}`}
                    onClick={() => track("practice_problem_selected", {
                      slug: problem.slug,
                      difficulty: problem.difficulty,
                      topic: problem.topic
                    })}
                    className="inline-flex h-12 w-full items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 min-h-[44px] touch-manipulation sm:w-auto"
                  >
                    Start Practice
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}
