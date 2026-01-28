import type { Metadata } from "next";
import { cookies } from "next/headers";
import { PracticePageClient } from "@/domains/practice/PracticePageClient";
import { getBaseUrl } from "@/lib/getBaseUrl";

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

export default async function Page() {
  // Fetch problems from API endpoint
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const baseUrl = getBaseUrl();
  const problems = await fetch(`${baseUrl}/api/v2/practice`, {
    cache: "no-store",
    headers: {
      Cookie: cookieHeader,
    },
  }).then(async (response) => {
    if (response.ok) {
      const data = await response.json();
      return data?.data ?? [];
    }
    return [];
  });

  return <PracticePageClient problems={problems} />;
}
