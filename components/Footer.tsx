"use client";

import Link from "next/link";
// import { useState } from "react";
// import { track } from "@/lib/analytics";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";

export function Footer() {
  /* Commented out newsletter feature
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [newsletterMessage, setNewsletterMessage] = useState<string>("");

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewsletterStatus("submitting");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    track("email_capture_submitted", {
      source: "footer",
      emailDomain: email.split("@")[1] ?? "unknown",
    });

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to subscribe");
      }

      // Handle already subscribed case
      if (data.message === "Already subscribed!") {
        setNewsletterStatus("success");
        setNewsletterMessage("Thanks for subscribing, you're already on our list!");
        track("email_capture_already_subscribed", { source: "footer" });
        e.currentTarget.reset();
        setTimeout(() => {
          setNewsletterStatus("idle");
          setNewsletterMessage("");
        }, 3000);
        return;
      }

      setNewsletterStatus("success");
      setNewsletterMessage("Successfully subscribed!");
      track("email_capture_success", { source: "footer" });
      e.currentTarget.reset();

      // Reset status after showing success message
      setTimeout(() => {
        setNewsletterStatus("idle");
        setNewsletterMessage("");
      }, 3000);
    } catch (error) {
      console.error("Newsletter subscription error:", error);
      setNewsletterStatus("error");
      setNewsletterMessage("An error occurred. Please try again.");
      track("email_capture_error", { source: "footer" });

      // Reset status after showing error message
      setTimeout(() => {
        setNewsletterStatus("idle");
        setNewsletterMessage("");
      }, 3000);
    }
  };
  */

  return (
    <footer className="border-t border-zinc-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 pb-8">
          {/* Brand Section */}
          <div className="lg:col-span-4">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">SD</span>
              </div>
              <span className="text-xl font-bold text-white">System Design Sandbox</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md mb-4">
              Practice system design interviews with AI-powered feedback. Build realistic
              architectures and get instant, actionable insights to improve your skills.
            </p>

            {/* Contact Info */}
            <div className="mb-6">
              <a
                href="mailto:hello@systemdesignsandbox.com"
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                hello@systemdesignsandbox.com
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  prefetch={false}
                  href="/practice"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Practice
                </Link>
              </li>
              <li>
                <Link
                  href="/learn"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Learn
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:hello@systemdesignsandbox.com"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link
                  href="/feedback"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Feedback
                </Link>
              </li>
              <li>
                <a
                  href="mailto:support@systemdesignsandbox.com"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Help
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/cookies"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter Column - Commented out feature
          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm mb-4">Stay Updated</h3>
            <p className="text-zinc-400 text-sm mb-4">Get updates and help validate this idea.</p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                name="email"
                placeholder="your@email.com"
                className="w-full bg-zinc-800 border-zinc-700 text-white placeholder-zinc-400 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                required
              />
              <Button
                type="submit"
                disabled={newsletterStatus === "submitting"}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-700 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all duration-300"
                aria-label="Subscribe to Newsletter"
                size="sm"
              >
                {newsletterStatus === "submitting" && (
                  <svg className="animate-spin h-3 w-3 mr-2 inline" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                {newsletterStatus === "success"
                  ? "Subscribed!"
                  : newsletterStatus === "error"
                    ? "Try again"
                    : "Subscribe"}
              </Button>
              {newsletterStatus === "error" && (
                <p className="text-red-400 text-xs text-center">
                  Subscription failed. Please try again.
                </p>
              )}
              {newsletterStatus === "success" && newsletterMessage && (
                <p className="text-green-400 text-xs text-center">{newsletterMessage}</p>
              )}
            </form>
          </div>
          */}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-800">
          <p className="text-zinc-500 text-sm text-center sm:text-left">
            © {new Date().getFullYear()} System Design Sandbox.
          </p>
        </div>
      </div>
    </footer>
  );
}
