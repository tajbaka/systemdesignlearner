import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback | System Design Sandbox",
  description: "Share your feedback, suggestions, or questions about System Design Sandbox.",
  alternates: {
    canonical: "https://www.systemdesignsandbox.com/feedback",
  },
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
