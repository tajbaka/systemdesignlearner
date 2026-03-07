// Static prerequisite tree for the practice page.
// Nodes are hand-positioned in 4 tiers flowing top-to-bottom.
// Edges represent "concepts from source help with target".

export const PROBLEM_POSITIONS: Record<string, { x: number; y: number; tier: number }> = {
  // Tier 0 — foundations (start here)
  "url-shortener": { x: 321, y: 2, tier: 0 },
  pastebin: { x: 1088, y: -4, tier: 0 },

  // Tier 1 — builds on basics
  "rate-limiter": { x: 100, y: 260, tier: 1 },
  leaderboard: { x: 521, y: 272, tier: 1 },
  "notification-system": { x: 1333, y: 288, tier: 1 },

  // Tier 2 — advanced
  "payment-system": { x: -16, y: 602, tier: 2 },
  "design-web-crawler": { x: 331, y: 601, tier: 2 },
  "design-dropbox": { x: 812, y: 459, tier: 2 },
  "job-scheduler": { x: 1212, y: 687, tier: 2 },
  "design-whatsapp": { x: 1502, y: 559, tier: 2 },

  // Tier 3 — complex
  "design-youtube": { x: 750, y: 799, tier: 3 },
};

export const PREREQUISITE_EDGES = [
  // Tier 0 → Tier 1
  { id: "url-rate", source: "url-shortener", target: "rate-limiter" },
  { id: "url-leader", source: "url-shortener", target: "leaderboard" },
  { id: "paste-notif", source: "pastebin", target: "notification-system" },

  // Tier 1 → Tier 2
  { id: "rate-pay", source: "rate-limiter", target: "payment-system" },
  { id: "rate-crawl", source: "rate-limiter", target: "design-web-crawler" },
  { id: "notif-job", source: "notification-system", target: "job-scheduler" },
  { id: "notif-drop", source: "notification-system", target: "design-dropbox" },
  { id: "notif-whats", source: "notification-system", target: "design-whatsapp" },
  { id: "leader-whats", source: "leaderboard", target: "design-whatsapp" },
  { id: "paste-drop", source: "pastebin", target: "design-dropbox" },

  // Same tier (Tier 2 → Tier 2)
  { id: "job-crawl", source: "job-scheduler", target: "design-web-crawler" },

  // Tier 2 → Tier 3
  { id: "drop-yt", source: "design-dropbox", target: "design-youtube" },
  { id: "job-yt", source: "job-scheduler", target: "design-youtube" },
] as const;
