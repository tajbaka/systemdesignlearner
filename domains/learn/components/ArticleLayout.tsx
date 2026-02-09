import { ReactNode } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/sidebar";
import { AuthenticatedNavbar } from "@/domains/authentication/AuthenticatedNavbar";
import { ArticleFooter } from "./ArticleFooter";
import { TableOfContents } from "./TableOfContents";
import { ArticleStructuredData } from "./ArticleStructuredData";

interface ArticleLayoutProps {
  title: string;
  subtitle: string;
  author?: string;
  date?: string;
  readTime?: string;
  description?: string;
  tableOfContents?: Array<{ id: string; title: string }>;
  slug: string;
  children: ReactNode;
}

export function ArticleLayout({
  title,
  subtitle,
  author = "System Design Sandbox",
  date,
  readTime,
  description,
  tableOfContents,
  slug,
  children,
}: ArticleLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Structured Data for SEO */}
      <ArticleStructuredData
        title={title}
        subtitle={subtitle}
        description={description}
        author={author}
        date={date}
        readTime={readTime}
        slug={slug}
      />
      <AuthenticatedNavbar variant="light" hideIcon={true} hideMobileMenu={true} />

      <Sidebar theme="light" />

      {/* Light mode wrapper for article */}
      <div className="md:ml-16 bg-white text-zinc-900">
        <main className="relative">
          {/* Article Header - Medium Style */}
          <article className="mx-auto max-w-[760px] px-8 py-16 sm:px-12 md:py-20">
            {/* Title - Serif font */}
            <h1 className="mb-4 font-serif text-[42px] font-extrabold leading-[1.1] tracking-tight text-zinc-800 sm:text-[48px] md:text-[56px]">
              {title}
            </h1>

            {/* Subtitle */}
            <h2 className="mb-10 text-[22px] font-normal leading-[1.4] text-zinc-600 sm:text-[24px]">
              {subtitle}
            </h2>

            {/* Author Info */}
            <div className="mb-12 flex items-center gap-3 border-b border-zinc-200 pb-8">
              <div className="h-12 w-12 flex-shrink-0 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{author.charAt(0)}</span>
              </div>
              <div className="flex items-center gap-2 text-[14px] text-zinc-600">
                <span className="font-medium text-zinc-800">{author}</span>
                {date && (
                  <>
                    <span>·</span>
                    <time dateTime={date}>
                      {new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </time>
                  </>
                )}
                {readTime && (
                  <>
                    <span>·</span>
                    <span>{readTime} read</span>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="mb-12 text-[20px] leading-[1.6] text-zinc-700">{description}</div>
            )}

            {/* Table of Contents */}
            {/* rendered client side so no seo benefits */}
            {tableOfContents && tableOfContents.length > 0 && (
              <TableOfContents items={tableOfContents} />
            )}

            {/* Article Content */}
            <div className="article-content">{children}</div>
            {/* Practice Button */}
            <div className="flex pt-6">
              <Link
                href="/practice"
                className="inline-flex items-center justify-center h-12 rounded-md px-6 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-base transition-all no-underline hover:no-underline"
              >
                Practice Now
              </Link>
            </div>
          </article>
        </main>

        <ArticleFooter />
      </div>
    </div>
  );
}
