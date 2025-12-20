import type { Metadata } from "next";
import { PastebinIntroClient } from "./PastebinIntroClient";
import { getBaseUrl } from "@/lib/utils";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/lib/constants/ogImages";

const baseUrl = getBaseUrl();
const ogImage = `${baseUrl}${PRACTICE_IMAGE_URLS[VALID_SLUGS.PASTEBIN]}`;

export const metadata: Metadata = {
  title: "Pastebin System Design - Interactive Tutorial & Practice",
  description:
    "Design a scalable text paste sharing service like Pastebin. Learn object storage, CDN caching, unique ID generation, and content expiration. Free hands-on practice with instant feedback.",
  keywords: [
    "pastebin design",
    "pastebin system design",
    "design pastebin interview",
    "pastebin architecture",
    "text sharing system design",
    "paste service design",
    "pastebin tutorial",
  ],
  openGraph: {
    title: "Pastebin System Design - Interactive Practice",
    description:
      "Master pastebin design: object storage, CDN caching, unique IDs, and scaling for millions of pastes. Free interactive tutorial.",
    type: "website",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "System Design Practice: Pastebin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImage],
  },
};

export default function PastebinIntroPage() {
  return <PastebinIntroClient />;
}
