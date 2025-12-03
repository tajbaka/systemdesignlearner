"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/lib/analytics";
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
    } catch {
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
                href="https://www.facebook.com/profile.php?id=61583644470417"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                aria-label="Facebook Page"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/systemdesignsandbox/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded-lg"
                aria-label="Instagram Profile"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
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
