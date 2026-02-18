"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { AuthenticatedNavbar } from "@/domains/authentication/AuthenticatedNavbar";
import { Sidebar } from "@/components/sidebar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { LinkBox } from "@/domains/practice/back-end/components/LinkBox";
import { ProgressBar } from "@/domains/practice/components/ProgressBar";
import type { ProblemSimpleResponse } from "@/app/api/v2/practice/schemas";
import { capitalize } from "@/utils/capitalize";

const BUTTON_CONFIG = {
  completed: { text: "View Results", href: "/practice/[slug]/score", color: "green" },
  in_progress: { text: "Continue", href: "/practice/[slug]/intro?continue=true", color: "blue" },
  not_started: { text: "Start Practice", href: "/practice/[slug]/intro", color: "blue" },
} as const;

const BUTTON_COLORS = {
  green: "bg-green-600 hover:bg-green-500",
  yellow: "bg-yellow-600 hover:bg-yellow-500",
  red: "bg-red-600 hover:bg-red-500",
  blue: "bg-blue-600 hover:bg-blue-500",
} as const;

const DIFFICULTY_COLORS = {
  easy: {
    bg: "bg-green-500/20",
    text: "text-green-400",
    border: "border-green-500/30",
  },
  medium: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
  },
  hard: {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/30",
  },
} as const;

function getButtonConfig(
  status: "in_progress" | "completed" | null,
  slug: string
): { text: string; href: string; color: string } {
  const statusKey = status ?? "not_started";
  const config = BUTTON_CONFIG[statusKey];
  const buttonColor = config.color as keyof typeof BUTTON_COLORS;

  return {
    text: config.text,
    href: config.href.replace("[slug]", slug),
    color: BUTTON_COLORS[buttonColor],
  };
}

function getDifficultyColors(difficulty: "easy" | "medium" | "hard" | null): string {
  const difficultyKey = difficulty ?? "medium";
  const colors = DIFFICULTY_COLORS[difficultyKey];
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

type PracticePageClientProps = {
  problems: ProblemSimpleResponse[];
};

export function PracticePageClient({ problems }: PracticePageClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <AuthenticatedNavbar hideIcon={true} hideOnMobile={true} />
      <Sidebar theme="dark" />
      <div className="md:ml-16">
        <main className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-4 py-8 sm:px-6 md:gap-10 md:py-12 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <header className="space-y-3">
              <div className="invisible md:visible inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
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
          </div>

          {/* Problems Grid */}
          <div className="grid gap-4 sm:gap-6">
            {problems.length === 0 ? (
              <Card className="bg-zinc-900 border-zinc-700">
                <CardContent className="p-6 text-center">
                  <p className="text-zinc-400">No practice problems available at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              problems.map((problem) => {
                const difficulty = problem.difficulty ?? "medium";
                const difficultyDisplay = capitalize(difficulty);
                const isCompleted = problem.status === "completed";
                const buttonConfig = getButtonConfig(problem.status, problem.slug);

                return (
                  <Link
                    key={problem.id}
                    href={buttonConfig.href}
                    prefetch={false}
                    onClick={() =>
                      track("practice_problem_selected", {
                        slug: problem.slug,
                        difficulty: difficultyDisplay,
                        status: problem.status,
                      })
                    }
                    className="block"
                  >
                    <Card
                      className={`bg-zinc-900 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer ${
                        isCompleted
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
                                  {problem.title ?? "Untitled Problem"}
                                </CardTitle>
                                {isCompleted && (
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                                    <Check className="h-3 w-3 text-green-400" />
                                    <span className="text-xs font-medium text-green-400">
                                      Completed
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-white-500/20 text-black-400 border border-white-500/30">
                                  {capitalize(problem.category)}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getDifficultyColors(
                                    difficulty as "easy" | "medium" | "hard" | null
                                  )}`}
                                >
                                  {difficultyDisplay}
                                </span>
                              </div>
                            </div>

                            <CardDescription className="text-sm text-zinc-400 mb-3 leading-relaxed">
                              {problem.description ?? ""}
                            </CardDescription>

                            {problem.status !== null &&
                              problem.totalSteps !== null &&
                              problem.completedSteps !== null && (
                                <ProgressBar
                                  completedSteps={problem.completedSteps}
                                  totalSteps={problem.totalSteps}
                                  className="mt-2 mb-1 max-w-xs"
                                />
                              )}

                            {/* Show links if available */}
                            {problem.links && problem.links.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                                  Related Links
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {problem.links.map((link, index) => (
                                    <LinkBox
                                      key={index}
                                      title={link.label}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        window.open(link.href, "_blank", "noopener,noreferrer");
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Button */}
                          <div className="flex-shrink-0 w-full sm:w-auto">
                            <Button
                              size="lg"
                              className={`h-12 w-full font-semibold transition-all duration-300 min-h-[44px] touch-manipulation sm:w-auto text-white ${buttonConfig.color}`}
                              onClick={(e) => {
                                // Prevent the card link from firing when button is clicked
                                e.stopPropagation();
                              }}
                            >
                              {buttonConfig.text}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
