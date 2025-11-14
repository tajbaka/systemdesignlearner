"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Footer() {
  const [newsletterStatus, setNewsletterStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [newsletterMessage, setNewsletterMessage] = useState<string>("");

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewsletterStatus("submitting");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewsletterStatus("success");
        setNewsletterMessage(data.message || "Successfully subscribed!");
        e.currentTarget.reset();
      } else {
        setNewsletterStatus("error");
        setNewsletterMessage(data.error || "Failed to subscribe. Please try again.");
      }
    } catch {
      setNewsletterStatus("error");
      setNewsletterMessage("An error occurred. Please try again.");
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      setNewsletterStatus("idle");
      setNewsletterMessage("");
    }, 3000);
  };

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
            <p className="text-zinc-400 text-sm leading-relaxed max-w-md mb-6">
              Interactive system design playground — drag, connect, and simulate realistic
              architectures. Master system design through hands-on practice.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/in/antonio-coppe"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                aria-label="LinkedIn Profile"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://antoniocoppe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                aria-label="Portfolio Website"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Product Column */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/play"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Playground
                </Link>
              </li>
              <li>
                <Link
                  href="/practice"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Practice
                </Link>
              </li>
              <li>
                <Link
                  href="/examples"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Examples
                </Link>
              </li>
              <li>
                <Link
                  href="/interview-guide"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Interview Guide
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Documentation
                </Link>
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
                  Support
                </a>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/AntonioCoppe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://www.linkedin.com/in/antonio-coppe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  LinkedIn
                </a>
              </li>
              <li>
                <a
                  href="https://antoniocoppe.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Portfolio
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@systemdesignsandbox.com"
                  className="text-zinc-400 hover:text-white transition-colors text-sm"
                >
                  Contact
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

          {/* Newsletter Column */}
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
                  <svg
                    className="animate-spin h-3 w-3 mr-2 inline"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
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
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-zinc-500 text-sm">
              © {new Date().getFullYear()} System Design Sandbox. Built by Antonio Coppe.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/cookies"
                className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
