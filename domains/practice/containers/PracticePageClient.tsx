"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Check, ExternalLink } from "lucide-react";
import { SCENARIOS } from "@/domains/practice/scenarios";
import { usePracticeCompletionStatus } from "@/domains/practice/hooks/usePracticeCompletionStatus";

// Helper function to capitalize difficulty
const capitalizeDifficulty = (difficulty: string): string => {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
};

export function PracticePageClient() {
  const { completedProblems } = usePracticeCompletionStatus();

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
                Tackle curated drills with a friendly walkthrough, then jump straight into the
                sandbox to validate your architecture.
              </p>
            </div>
          </header>
          {/* <Card className="w-full max-w-md md:max-w-xs bg-zinc-900/70 border-zinc-800">
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                id="practice-search"
                type="search"
                disabled
                className="h-11 w-full border-dashed border-zinc-700 bg-zinc-900 text-zinc-500 min-h-[44px] focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder="Filter problems"
              />
              <p className="text-xs text-zinc-500">
                Looking for something specific? Drop a request on{" "}
                <Link href="/feedback" className="text-blue-200 underline-offset-2 hover:underline">
                  feedback
                </Link>
                .
              </p>
            </CardContent>
          </Card> */}
        </div>

        {/* Problems Grid */}
        <div className="grid gap-4 sm:gap-6">
          {[...SCENARIOS]
            .sort((a, b) => {
              // Sort by hasPractice: true first, then false
              if (a.hasPractice === b.hasPractice) return 0;
              return a.hasPractice ? -1 : 1;
            })
            .map((scenario) => {
              const isCompleted = completedProblems.has(scenario.id);
              const isAvailable = scenario.hasPractice === true;
              const difficultyDisplay = capitalizeDifficulty(scenario.difficulty);
              return (
                <Card
                  key={scenario.id}
                  className={`bg-zinc-900 transition-all duration-300 hover:shadow-lg ${
                    !isAvailable
                      ? "border-zinc-700/50 opacity-75"
                      : isCompleted
                        ? "border-green-500/50 hover:border-green-500/70 hover:shadow-green-500/10"
                        : "border-zinc-700 hover:border-zinc-600 hover:shadow-blue-500/10"
                  }`}
                >
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      {/* Problem Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <CardTitle className="text-lg sm:text-xl text-white">
                              {scenario.title}
                            </CardTitle>
                            {isCompleted && isAvailable && (
                              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                                <Check className="h-3 w-3 text-green-400" />
                                <span className="text-xs font-medium text-green-400">
                                  Completed
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                scenario.difficulty === "easy"
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                  : scenario.difficulty === "medium"
                                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {difficultyDisplay}
                            </span>
                          </div>
                        </div>

                        <CardDescription className="text-sm text-zinc-400 mb-3 leading-relaxed">
                          {scenario.briefDescription || scenario.description}
                        </CardDescription>

                        {/* Prerequisites */}
                        {scenario.prerequisites && scenario.prerequisites.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                              Prerequisites
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {scenario.prerequisites.map((prerequisite, index) => (
                                <Link
                                  key={index}
                                  href={prerequisite.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/50 transition-all"
                                >
                                  {prerequisite.title}
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500">Topic:</span>
                            <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">
                              {scenario.category}
                            </span>
                          </div>
                          {scenario.estimatedTime && (
                            <div className="flex items-center gap-1">
                              <span className="text-zinc-500">Time:</span>
                              <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-200">
                                {scenario.estimatedTime}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex-shrink-0 w-full sm:w-auto">
                        {isAvailable ? (
                          <Button
                            asChild
                            size="lg"
                            className={`h-12 w-full font-semibold transition-all duration-300 min-h-[44px] touch-manipulation sm:w-auto ${
                              isCompleted
                                ? "bg-green-600 hover:bg-green-500 text-white"
                                : "bg-blue-600 hover:bg-blue-500 text-white"
                            }`}
                          >
                            <Link
                              href={
                                isCompleted
                                  ? `/practice/${scenario.id}`
                                  : `/practice/${scenario.id}/intro`
                              }
                              onClick={() =>
                                track("practice_problem_selected", {
                                  slug: scenario.id,
                                  difficulty: difficultyDisplay,
                                  topic: scenario.category,
                                  completed: isCompleted,
                                })
                              }
                            >
                              {isCompleted ? "View Results" : "Start Practice"}
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-sm text-zinc-500 italic">Coming soon...</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
