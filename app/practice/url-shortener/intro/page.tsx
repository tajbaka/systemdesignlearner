import type { Metadata } from "next";
import { URLShortenerIntroClient } from "./URLShortenerIntroClient";
import { getBaseUrl } from "@/lib/utils";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/lib/constants/ogImages";

const baseUrl = getBaseUrl();
const ogImage = `${baseUrl}${PRACTICE_IMAGE_URLS[VALID_SLUGS.URL_SHORTENER]}`;

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
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "System Design Practice: Url Shortener",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImage],
  },
};

export default function URLShortenerIntroPage() {
  return <URLShortenerIntroClient />;
}
