import type { Metadata } from "next";
import { URLShortenerIntroClient } from "./URLShortenerIntroClient";

export const metadata: Metadata = {
  title: "URL Shortener System Design - Interactive Tutorial & Practice",
  description:
    "Design a scalable URL shortener system like bit.ly or TinyURL. Learn hashing algorithms, database sharding, caching strategies for millions of requests. Free hands-on practice with instant feedback.",
  keywords: [
    "url shortener design",
    "url shortener system design",
    "design url shortener interview",
    "url shortener architecture",
    "bitly system design",
    "tinyurl design",
    "url shortener tutorial",
  ],
  openGraph: {
    title: "URL Shortener System Design - Interactive Practice",
    description:
      "Master URL shortener design: hashing, sharding, caching, and scaling to millions of requests. Free interactive tutorial.",
    type: "website",
  },
};

export default function URLShortenerIntroPage() {
  return <URLShortenerIntroClient />;
}
