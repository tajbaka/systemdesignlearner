import type { Metadata } from "next";
import { PracticePageClient } from "@/domains/practice/containers/PracticePageClient";

export const metadata: Metadata = {
  title: "System Design Practice Scenarios - Interactive Interview Challenges",
  description:
    "Practice system design interviews with real-world scenarios. Master distributed systems, caching strategies, and scalability patterns through hands-on interactive tutorials. Free practice problems for 2025.",
  keywords: [
    "system design practice",
    "system design scenarios",
    "system design exercises",
    "system design problems",
    "practice system design",
    "system design challenges",
  ],
  openGraph: {
    title: "System Design Practice Scenarios - Interactive Challenges",
    description:
      "Master system design interviews with hands-on practice scenarios. URL shortener, distributed systems, caching & more.",
    type: "website",
  },
};

export default function Page() {
  return <PracticePageClient />;
}
