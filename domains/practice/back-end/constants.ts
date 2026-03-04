import type { PracticeStepWithRoute } from "./types";

export const STEPS = {
  INTRO: "intro",
  FUNCTIONAL: "functional",
  NON_FUNCTIONAL: "nonFunctional",
  API: "api",
  HIGH_LEVEL_DESIGN: "highLevelDesign",
  SCORE: "score",
};

export const SLUGS_TO_STEPS = {
  functional: STEPS.FUNCTIONAL,
  "non-functional": STEPS.NON_FUNCTIONAL,
  api: STEPS.API,
  "high-level-design": STEPS.HIGH_LEVEL_DESIGN,
  score: STEPS.SCORE,
};

export const PRACTICE_STEPS: Record<(typeof STEPS)[keyof typeof STEPS], PracticeStepWithRoute> = {
  [STEPS.FUNCTIONAL]: {
    title: "Functional Requirements",
    description: "Define what the system must do",
    tooltipDescription:
      "Describe what users can do and the core capabilities the system must provide. Example: Users create and manage content, search across the platform, and receive real-time notifications about relevant activity.",
    route: "functional",
    href: "/learn/system-design-structure#functional-requirements",
    order: 0,
  },
  [STEPS.NON_FUNCTIONAL]: {
    title: "Non-Functional Requirements",
    description: "Latency, throughput, availability",
    tooltipDescription:
      "Define performance constraints: latency targets, throughput, and availability goals. Example: Low latency responses (sub-second). High Consistency. We need a certain number of reads over write.",
    route: "non-functional",
    href: "/learn/system-design-structure#non-functional-requirements",
    order: 1,
  },
  [STEPS.API]: {
    title: "API Design",
    description: "Endpoints & payloads",
    tooltipDescription:
      "Define the HTTP endpoints your service exposes and their request/response formats. Example: POST /api/v1/posts to create content, GET /api/v1/posts/:id to retrieve a post, and PUT /api/v1/posts/:id to update content.",
    route: "api",
    href: "/learn/system-design-structure#api-design",
    order: 2,
  },
  [STEPS.HIGH_LEVEL_DESIGN]: {
    title: "High Level Design",
    description: "Design and iterate visually",
    tooltipDescription: "Design your system architecture visually with drag-and-drop components. ",
    route: "high-level-design",
    href: "/learn/system-design-structure#high-level-design-design-diagram",
    order: 3,
  },
  [STEPS.SCORE]: {
    title: "Finish",
    description: "Scorecard & sharing",
    tooltipDescription: "Review your scorecard.",
    route: "score",
    href: "/learn/system-design-structure",
    order: 4,
  },
};

export const VALID_SLUGS = {
  URL_SHORTENER: "url-shortener",
  PASTEBIN: "pastebin",
} as const;

export const PRACTICE_IMAGE_URLS = {
  [VALID_SLUGS.URL_SHORTENER]: "/desktop-url-shortener-practice.gif",
  [VALID_SLUGS.PASTEBIN]: "/desktop-pastebin-practice.gif",
} as const;
