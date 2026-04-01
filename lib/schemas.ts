/**
 * Shared Schema.org structured data constants.
 *
 * Centralises the Organisation identity so every page emits identical
 * JSON-LD without duplication. Import what you need:
 *
 *   import { ORGANIZATION_SCHEMA, BASE_URL } from "@/lib/schemas";
 */

/** Canonical production URL — use for JSON-LD `url` values and schema references. */
export const BASE_URL = "https://www.systemdesignlearner.com";

/** Social profile URLs referenced in sameAs and contact pages. */
export const SOCIAL_LINKS = ["https://www.instagram.com/systemdesignlearner/"] as const;

/**
 * Schema.org Organization — the single source of truth used by every page
 * that embeds an Organisation entity (homepage, about, contact, articles).
 */
export const ORGANIZATION_SCHEMA = {
  "@type": "Organization" as const,
  name: "System Design Learner",
  url: BASE_URL,
  logo: `${BASE_URL}/logo-512x512.png`,
  description: "Interactive system design interview practice platform with AI-powered feedback",
  foundingDate: "2025",
  sameAs: [...SOCIAL_LINKS],
};

export const AUTHOR_SCHEMA = {
  "@type": "Person" as const,
  name: "Arian Taj",
  url: "https://www.linkedin.com/in/arian-taj/",
  jobTitle: "Software Engineer",
} as const;
