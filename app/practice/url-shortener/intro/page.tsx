"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";

export default function URLShortenerIntroPage() {
  const router = useRouter();

  const handleStartPractice = () => {
    track("practice_intro_start", {
      slug: "url-shortener"
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
              <h1 className="text-4xl font-bold text-white sm:text-5xl">
                URL Shortener
              </h1>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Description</p>
              <p className="text-lg text-zinc-300 leading-relaxed sm:text-xl">
                Design a system that converts long URLs into short, shareable links.
                Your system should handle link creation, redirection, and basic analytics.
                Think about storage, uniqueness, and performance at scale.
              </p>
            </div>
          </div>

          {/* Start Practice Button - Right aligned */}
          <div className="flex justify-end items-center gap-4 pt-4">
            <p className="text-sm text-zinc-500">
              15-20 minutes
            </p>
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
