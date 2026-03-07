/**
 * Learn Domain Utilities
 *
 * Utility functions for loading and processing articles
 */

import fs from "fs";
import path from "path";
import Link from "next/link";
import Image from "next/image";
import type { Components } from "react-markdown";
import type { Element } from "hast";
import type { ArticleConfig, ArticlesData, ArticleCategory } from "./types";
import { ArticleDiagram } from "./components/ArticleDiagram";

// Load articles configuration
export function loadArticlesConfig(): ArticlesData {
  const configPath = path.join(process.cwd(), "domains/learn/articles.json");
  const configContent = fs.readFileSync(configPath, "utf8");
  return JSON.parse(configContent);
}

// Get article by slug
export function getArticleBySlug(slug: string): ArticleConfig | undefined {
  const data = loadArticlesConfig();
  return data.articles.find((article) => article.slug === slug);
}

// Get categories with article titles
export function getCategories(): ArticleCategory[] {
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

// Helper function to convert heading text to ID
export function headingToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters except hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .trim();
}

// Process markdown content
export function processMarkdownContent(
  content: string,
  removeFirstHeading: boolean = false
): string {
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
export function createMarkdownComponents(): Components {
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
    p: ({ children, node, ...props }) => {
      const text = extractText(children);
      if (text === "[PRACTICE_BUTTON]") {
        return (
          <div className="mt-8 flex">
            <Link
              prefetch={false}
              href="/practice/url-shortener"
              className="inline-flex items-center justify-center h-9 rounded-md px-4 bg-emerald-500 hover:bg-emerald-600  text-white font-semibold text-sm transition-all no-underline hover:no-underline"
            >
              Try Practice
            </Link>
          </div>
        );
      }
      // Check if this paragraph contains a single diagram image.
      // Markdown wraps ![alt](diagram:x) in a <p>, but ArticleDiagram
      // renders block-level divs that can't be nested inside <p>.
      const imgChild = node?.children?.find(
        (child): child is Element =>
          child.type === "element" &&
          child.tagName === "img" &&
          typeof child.properties?.src === "string" &&
          child.properties.src.startsWith("diagram:")
      );
      if (imgChild) {
        const diagramId = (imgChild.properties.src as string).replace("diagram:", "");
        return <ArticleDiagram diagramId={diagramId} />;
      }
      return <p {...props}>{children}</p>;
    },
    table: ({ children, ...props }) => (
      <div className="-mx-4 overflow-x-auto sm:mx-0">
        <table {...props}>{children}</table>
      </div>
    ),
    img: ({ src, alt }) => {
      if (!src || typeof src !== "string") return null;

      return (
        <span className="my-12 block w-full">
          <Image
            src={src}
            alt={alt || ""}
            width={1200}
            height={400}
            className="w-full h-auto"
            sizes="100vw"
          />
        </span>
      );
    },
  };
}
