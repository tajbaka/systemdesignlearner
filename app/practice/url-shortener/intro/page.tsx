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

      {/* Content - Centered and compact */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl space-y-6">
          {/* Title */}
          <div className="space-y-3 text-center">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              URL Shortener
            </h1>
            <p className="text-sm text-zinc-400 sm:text-base">
              Design a system that converts long URLs into short, shareable links
            </p>
          </div>

          {/* Example */}
          <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Long URL</div>
              <div className="break-all font-mono text-xs text-zinc-400 sm:text-sm">
                example.com/products/category/electronics/laptops?sort=price
              </div>
            </div>
            <div className="flex justify-center">
              <ArrowRight className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase tracking-wide">Short URL</div>
              <div className="font-mono text-xs text-blue-400 sm:text-sm">
                short.link/abc123
              </div>
            </div>
          </div>

          {/* Key Points */}
          <div className="space-y-2 text-sm text-zinc-300">
            <p className="leading-relaxed">
              Your system should handle link creation, redirection, and basic analytics.
              Think about storage, uniqueness, and performance at scale.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={handleStartPractice}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all sm:w-auto sm:px-8 min-h-[44px]"
            >
              Start Practice
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <p className="text-xs text-zinc-500">
              15-20 minutes
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
