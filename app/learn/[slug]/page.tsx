import { ArticleLayout } from "@/components/ArticleLayout";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/utils";
import { VALID_SLUGS, PRACTICE_IMAGE_URLS } from "@/lib/constants/ogImages";
import type { ArticleCategory } from "@/components/ArticleSidebar";

// Types
interface ArticleConfig {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  author: string;
  date: string;
  readTime: string;
  markdownFile: string;
  removeFirstHeading?: boolean;
  keywords?: string[];
  tableOfContents: Array<{ id: string; title: string }>;
}

interface ArticlesData {
  categories: Array<{
    id: string;
    title: string;
    icon?: string;
    articles: Array<{ id: string; slug: string }>;
  }>;
  articles: ArticleConfig[];
}

// Load articles configuration
function loadArticlesConfig(): ArticlesData {
  const configPath = path.join(process.cwd(), "app/learn/[slug]/articles.json");
  const configContent = fs.readFileSync(configPath, "utf8");
  return JSON.parse(configContent);
}

// Get article by slug
function getArticleBySlug(slug: string): ArticleConfig | undefined {
  const data = loadArticlesConfig();
  return data.articles.find((article) => article.slug === slug);
}

// Get categories with article titles
function getCategories(): ArticleCategory[] {
  const data = loadArticlesConfig();
  return data.categories.map((category) => ({
    id: category.id,
    title: category.title,
    icon: category.icon,
    articles: category.articles.map((articleRef) => {
      const article = data.articles.find((a) => a.slug === articleRef.slug);
      return {
        id: articleRef.id,
        title: article?.title || articleRef.slug,
        slug: articleRef.slug,
      };
    }),
  }));
}

// Pre-render all article pages at build time (SSG)
export async function generateStaticParams() {
  const data = loadArticlesConfig();
  return data.articles.map((article) => ({
    slug: article.slug,
  }));
}

type Props = {
  params: Promise<{ slug: string }>;
};

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const config = getArticleBySlug(slug);

  if (!config) {
    return {
      title: "Article Not Found",
    };
  }

  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/learn/${slug}`;
  const ogImage = `${baseUrl}${PRACTICE_IMAGE_URLS[VALID_SLUGS.URL_SHORTENER]}`;

  // Use article-specific keywords, fallback to generic ones
  const keywords = config.keywords || [
    "system design",
    "distributed systems",
    "software architecture",
    "scalability",
    "system design interview",
    "backend engineering",
  ];

  return {
    title: config.title,
    description: config.description,
    keywords,
    authors: [{ name: config.author }],
    creator: config.author,
    publisher: "System Design Sandbox",
    openGraph: {
      type: "article",
      locale: "en_US",
      url,
      siteName: "System Design Sandbox",
      title: config.title,
      description: config.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ],
      publishedTime: config.date,
      authors: [config.author],
      section: "System Design",
      tags: keywords.slice(0, 4), // Use article-specific keywords for OG tags
    },
    twitter: {
      card: "summary_large_image",
      title: config.title,
      description: config.description,
      images: [ogImage],
      creator: "@systemdesignsb",
    },
    alternates: {
      canonical: url,
    },
    other: {
      "article:published_time": config.date,
      "article:author": config.author,
      "article:section": "System Design",
      "article:tag": "system design, distributed systems, software architecture",
    },
  };
}

// Helper function to convert heading text to ID
function headingToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

// Process markdown content
function processMarkdownContent(content: string, removeFirstHeading: boolean = false): string {
  let processed = content;

  // Remove first heading if specified (for articles where title is already in the layout)
  if (removeFirstHeading) {
    processed = processed.replace(/^##\s+\*\*.*?\*\*\s*\n\n/, "");
  }

  // Convert ### headings to ## (h3 to h2) for better hierarchy
  processed = processed.replace(/^###\s+/gm, "## ");

  // Remove ** from headings to make ID generation easier (bold will still render in content)
  processed = processed.replace(/^(##+)\s+\*\*(.+?)\*\*\s*$/gm, "$1 $2");

  return processed;
}

// Create ReactMarkdown components
function createMarkdownComponents(): Components {
  // Helper to extract text from React children for ID generation
  const extractText = (children: React.ReactNode): string => {
    if (typeof children === "string") return children.trim();
    if (typeof children === "number") return String(children);
    if (Array.isArray(children)) {
      return children.map(extractText).join(" ").trim();
    }
    if (children && typeof children === "object" && "props" in children) {
      const props = (children as { props?: { children?: React.ReactNode } }).props;
      if (props?.children) return extractText(props.children);
    }
    return "";
  };

  return {
    h2: ({ children, ...props }) => {
      const text = extractText(children);
      const id = headingToId(text);
      return (
        <section id={id}>
          <h2 {...props}>{children}</h2>
        </section>
      );
    },
    h3: ({ children, ...props }) => {
      const text = extractText(children);
      const id = headingToId(text);
      return (
        <h3 id={id} {...props}>
          {children}
        </h3>
      );
    },
    a: ({ href, children, ...props }) => {
      // Handle internal links with custom styling
      if (href?.startsWith("/")) {
        return (
          <Link
            href={href}
            className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-2 transition-colors"
            {...props}
          >
            {children}
          </Link>
        );
      }
      // External links
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-2 transition-colors"
          {...props}
        >
          {children}
        </a>
      );
    },
    p: ({ children, ...props }) => {
      const text = extractText(children);
      if (text === "[PRACTICE_BUTTON]") {
        return (
          <div className="mt-8 flex">
            <Link
              href="/practice/url-shortener/intro"
              className="inline-flex items-center justify-center h-9 rounded-md px-4 bg-emerald-500 hover:bg-emerald-600  text-white font-semibold text-sm transition-all no-underline hover:no-underline"
            >
              Try Practice
            </Link>
          </div>
        );
      }
      return <p {...props}>{children}</p>;
    },
  };
}

export default async function LearnArticlePage({ params }: Props) {
  const { slug } = await params;
  const config = getArticleBySlug(slug);

  if (!config) {
    notFound();
  }

  const categories = getCategories();

  // Read the markdown file
  const markdownPath = path.join(process.cwd(), "app/learn/[slug]", config.markdownFile);
  let markdownContent = fs.readFileSync(markdownPath, "utf8");

  // Process markdown
  markdownContent = processMarkdownContent(markdownContent, config.removeFirstHeading);

  // Create markdown components
  const components = createMarkdownComponents();

  return (
    <ArticleLayout
      title={config.title}
      subtitle={config.subtitle}
      author={config.author}
      date={config.date}
      readTime={config.readTime}
      description={config.description}
      tableOfContents={config.tableOfContents}
      categories={categories}
      slug={slug}
    >
      <ReactMarkdown components={components}>{markdownContent}</ReactMarkdown>
    </ArticleLayout>
  );
}
