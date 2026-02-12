"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { LinkBox } from "../../components/LinkBox";

type Difficulty = "easy" | "medium" | "hard";
type Category = string;

type Prerequisite = {
  title: string;
  href: string;
};

type LinkItem = {
  href: string;
  title: string;
};

type IntroStepUIProps = {
  title: string;
  description: string;
  category?: Category;
  difficulty?: Difficulty;
  estimatedTime?: string;
  prerequisites?: Prerequisite[];
  hints?: LinkItem[];
  buttonText?: string;
  onStartPractice: () => void;
};

export function IntroStepUI({
  title,
  description,
  category,
  difficulty,
  estimatedTime,
  prerequisites,
  hints,
  buttonText = "Start Practice",
  onStartPractice,
}: IntroStepUIProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 sm:px-6">
        <Link
          prefetch={false}
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
              <h1 className="text-4xl font-bold text-white sm:text-5xl">{title}</h1>
            </div>

            {/* Metadata Badges */}
            {(category || difficulty) && (
              <div className="flex flex-wrap gap-2">
                {category && (
                  <span className="px-3 py-1 text-sm capitalize font-medium rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {category}
                  </span>
                )}
                {difficulty && (
                  <span
                    className={`px-3 py-1 capitalize text-sm font-medium rounded-md border ${
                      difficulty === "easy"
                        ? "bg-green-500/10 text-green-300 border-green-500/20"
                        : difficulty === "medium"
                          ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/20"
                          : "bg-red-500/10 text-red-300 border-red-500/20"
                    }`}
                  >
                    {difficulty}
                  </span>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                Description
              </p>
              <p className="text-lg text-zinc-300 leading-relaxed sm:text-xl">{description}</p>
            </div>

            {/* Prerequisites */}
            {prerequisites && prerequisites.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                  Prerequisites
                </p>
                <div className="flex flex-wrap gap-2">
                  {prerequisites.map((prerequisite, index) => (
                    <Link
                      prefetch={false}
                      key={index}
                      href={prerequisite.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-300 hover:border-blue-500/50 transition-all cursor-pointer"
                    >
                      {prerequisite.title}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {hints && hints.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">
                  Prerequisites
                </p>
                <div className="flex flex-wrap gap-2">
                  {hints
                    .filter((hint) => hint.title && hint.href)
                    .map((hint, index) => (
                      <LinkBox
                        key={index}
                        title={hint.title!}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.open(hint.href!, "_blank", "noopener,noreferrer");
                        }}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Button - Right aligned */}
          <div className="flex justify-end items-center gap-4 pt-4">
            {estimatedTime && <p className="text-sm text-zinc-500">{estimatedTime}</p>}
            <Button
              size="lg"
              onClick={onStartPractice}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all px-8 min-h-[48px] text-base"
            >
              {buttonText}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
