/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://www.systemdesignsandbox.com",
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    additionalSitemaps: [
      // Include the main sitemap explicitly
      "https://www.systemdesignsandbox.com/sitemap.xml",
    ],
  },
  exclude: ["/api/*", "/server-sitemap.xml", "/sso-callback"],
  generateIndexSitemap: false,
  changefreq: "weekly",
  priority: 0.7,
  // Ensure all important routes are in the sitemap
  additionalPaths: async (_config) => {
    const learnArticles = [
      "introduction",
      "system-design-structure",
      "size-calculation",
      "database-caching",
      "cap-theorem",
      "scaling",
      "object-storage-cdn",
      "rate-limiting-algorithms",
      "message-queues",
      "websockets-realtime",
      "design-url-shortener",
      "design-pastebin",
      "design-rate-limiter",
      "design-notification-system",
      "design-whatsapp",
    ];

    const practiceSlugs = [
      "url-shortener",
      "pastebin",
      "rate-limiter",
      "notification-system",
      "whatsapp",
    ];

    const practiceSteps = [
      "intro",
      "functional",
      "non-functional",
      "api",
      "high-level-design",
      "score",
    ];

    const paths = [];

    // Learn article pages
    for (const slug of learnArticles) {
      paths.push({
        loc: `/learn/${slug}`,
        changefreq: "weekly",
        priority: 0.8,
      });
    }

    // Practice intro pages (highest priority practice pages)
    for (const slug of practiceSlugs) {
      paths.push({
        loc: `/practice/${slug}/intro`,
        changefreq: "weekly",
        priority: 0.8,
      });
    }

    // Practice step pages
    for (const slug of practiceSlugs) {
      for (const step of practiceSteps) {
        if (step === "intro") continue; // already added above
        paths.push({
          loc: `/practice/${slug}/${step}`,
          changefreq: "weekly",
          priority: 0.6,
        });
      }
    }

    return paths;
  },
  transform: async (config, path) => {
    // Custom priority for important pages
    let priority = 0.7;
    let changefreq = "weekly";

    if (path === "/") {
      priority = 1.0;
      changefreq = "daily";
    } else if (path === "/practice") {
      priority = 0.9;
      changefreq = "daily";
    } else if (path.startsWith("/learn/")) {
      priority = 0.8;
      changefreq = "weekly";
    } else if (path.match(/\/practice\/[\w-]+\/intro$/)) {
      priority = 0.8;
      changefreq = "weekly";
    } else if (path.startsWith("/practice/")) {
      priority = 0.6;
      changefreq = "weekly";
    } else if (
      path === "/feedback" ||
      path === "/privacy" ||
      path === "/terms" ||
      path === "/cookies"
    ) {
      priority = 0.3;
      changefreq = "monthly";
    }

    return {
      loc: path,
      changefreq,
      priority,
    };
  },
};
