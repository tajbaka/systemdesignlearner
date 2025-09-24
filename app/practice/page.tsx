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
  },
];

export default function PracticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-3xl font-semibold text-white">Practice</h1>
          <p className="text-sm text-zinc-400">
            Work through guided prompts to practice system design decisions.
          </p>
        </header>
        <label className="flex w-full max-w-[240px] flex-col gap-1 text-sm text-zinc-400">
          Search (coming soon)
          <input
            type="search"
            disabled
            className="h-10 rounded-full border border-dashed border-zinc-700 bg-zinc-900 px-4 text-sm text-zinc-500"
            placeholder="Filter problems"
          />
        </label>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-zinc-700 bg-zinc-900 shadow-sm">
        <table className="min-w-full divide-y divide-zinc-800 text-sm">
          <thead className="bg-zinc-950 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-4 py-3">Problem</th>
              <th className="px-4 py-3">Difficulty</th>
              <th className="px-4 py-3">Topic</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {PROBLEMS.map((problem) => (
              <tr key={problem.slug}>
                <td className="px-4 py-4 text-sm font-semibold text-white">
                  <div className="flex flex-col">
                    <span>{problem.name}</span>
                    <span className="text-xs text-zinc-400">Single short link MVP</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-zinc-300">{problem.difficulty}</td>
                <td className="px-4 py-4 text-zinc-300">{problem.topic}</td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/practice/${problem.slug}`}
                    onClick={() => track("practice_problem_selected", {
                      slug: problem.slug,
                      difficulty: problem.difficulty,
                      topic: problem.topic
                    })}
                    className="inline-flex h-10 items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Start
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </main>
    </div>
  );
}
