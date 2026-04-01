import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feedback | System Design Learner",
  description: "Share your feedback, suggestions, or questions about System Design Learner.",
  alternates: {
    canonical: "https://www.systemdesignlearner.com/feedback",
  },
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
