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
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:gap-2 sm:flex-row sm:items-center sm:justify-between">
          <header>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white">Practice</h1>
            <p className="text-sm sm:text-base text-zinc-400 mt-1">
              Work through guided prompts to practice system design decisions.
            </p>
          </header>
          <label className="flex w-full max-w-[280px] flex-col gap-1 text-sm text-zinc-400">
            Search (coming soon)
            <input
              type="search"
              disabled
              className="h-10 rounded-full border border-dashed border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-500 min-h-[44px]"
              placeholder="Filter problems"
            />
          </label>
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
                    <h3 className="text-lg sm:text-xl font-semibold text-white truncate">
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
                      <span className="text-zinc-300 bg-zinc-800 px-2 py-1 rounded">
                        {problem.topic}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-zinc-500">Time:</span>
                      <span className="text-zinc-300">
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
                    className="inline-flex w-full sm:w-auto h-11 items-center justify-center rounded-lg bg-blue-600 px-6 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[44px]"
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
