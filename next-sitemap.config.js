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
  },
  exclude: ["/api/*", "/server-sitemap.xml"],
  generateIndexSitemap: false,
  changefreq: "weekly",
  priority: 0.7,
  // Add dynamic routes that aren't auto-discovered
  additionalPaths: async (_config) => [
    {
      loc: "/play",
      changefreq: "weekly",
      priority: 0.9,
      lastmod: new Date().toISOString(),
    },
  ],
  transform: async (config, path) => {
    // Custom priority for important pages
    let priority = 0.7;
    let changefreq = "weekly";

    if (path === "/") {
      priority = 1.0;
      changefreq = "daily";
    } else if (path.startsWith("/practice/url-shortener") || path === "/practice") {
      priority = 0.9;
      changefreq = "daily";
    } else if (path === "/interview-guide") {
      priority = 0.9;
      changefreq = "weekly";
    } else if (path === "/docs") {
      priority = 0.8;
      changefreq = "weekly";
    } else if (
      path === "/feedback" ||
      path === "/privacy" ||
      path === "/terms" ||
      path === "/cookies"
    ) {
      priority = 0.3;
      changefreq = "monthly";
    } else if (path === "/play") {
      priority = 0.7;
      changefreq = "weekly";
    }

    return {
      loc: path,
      changefreq,
      priority,
      lastmod: new Date().toISOString(),
    };
  },
};
