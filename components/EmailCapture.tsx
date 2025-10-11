"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

type EmailCaptureStatus = "idle" | "submitting" | "success" | "error";

type EmailCaptureProps = {
  title?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  successMessage?: string;
  alreadySubscribedMessage?: string;
  className?: string;
};

const DEFAULT_COPY = {
  title: "Get new daily scenarios",
  description: "Join the waitlist to receive fresh practice prompts and product updates.",
  placeholder: "you@example.com",
  buttonLabel: "Notify me",
  successMessage: "You’re on the list! Check your inbox for a welcome note.",
  alreadySubscribedMessage: "You’re already subscribed — stay tuned for the next drop!",
} as const;

export function EmailCapture({
  title = DEFAULT_COPY.title,
  description = DEFAULT_COPY.description,
  placeholder = DEFAULT_COPY.placeholder,
  buttonLabel = DEFAULT_COPY.buttonLabel,
  successMessage = DEFAULT_COPY.successMessage,
  alreadySubscribedMessage = DEFAULT_COPY.alreadySubscribedMessage,
  className,
}: EmailCaptureProps) {
  const [status, setStatus] = useState<EmailCaptureStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "submitting") return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get("email") as string | null)?.trim();

    if (!email) {
      setStatus("error");
      setMessage("Enter an email so we know where to send the scenarios.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    track("email_capture_submitted", { source: "practice-review", emailDomain: email.split("@")[1] ?? "unknown" });

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to subscribe");
      }

      form.reset();

      if (result?.message === "Already subscribed!") {
        setStatus("success");
        setMessage(alreadySubscribedMessage);
        track("email_capture_already_subscribed", { source: "practice-review" });
      } else {
        setStatus("success");
        setMessage(successMessage);
        track("email_capture_success", { source: "practice-review" });
      }
    } catch (error) {
      console.error("Email capture failed", error);
      setStatus("error");
      setMessage("Something went wrong. Try again in a moment.");
      track("email_capture_error", { source: "practice-review" });
    } finally {
      // Reset back to idle after a short delay so the button recovers
      window.setTimeout(() => {
        setStatus("idle");
      }, 3500);
    }
  };

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 text-white ${className ?? ""}`}
      aria-live={status === "success" || status === "error" ? "polite" : "off"}
    >
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold uppercase tracking-wide text-emerald-100">{title}</h3>
        <p className="text-sm leading-relaxed text-emerald-50/80">{description}</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            name="email"
            required
            placeholder={placeholder}
            className="h-16 min-h-[3.5rem] sm:h-12 sm:min-h-0 flex-1 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 text-sm text-white placeholder:text-emerald-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            autoComplete="email"
            disabled={status === "submitting"}
            aria-label="Email address"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:bg-white/80"
          >
            {status === "submitting" ? (
              <svg className="h-4 w-4 animate-spin text-emerald-900" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V2C5.373 2 1 6.373 1 12h3zm2 5.291A7.962 7.962 0 014 12H1c0 3.042 1.135 5.824 3 7.938l2-2.647z"
                />
              </svg>
            ) : (
              buttonLabel
            )}
          </button>
        </div>
      </form>

      {message ? (
        <p
          className={`text-xs ${
            status === "error" ? "text-rose-200" : "text-emerald-100"
          }`}
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
