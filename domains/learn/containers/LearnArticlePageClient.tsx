import { notFound } from "next/navigation";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import fs from "fs";
import path from "path";
import { ArticleLayout } from "../components/ArticleLayout";
import { getArticleBySlug, processMarkdownContent, createMarkdownComponents } from "../utils";

type LearnArticlePageClientProps = {
  slug: string;
};

export async function LearnArticlePageClient({ slug }: LearnArticlePageClientProps) {
  const config = getArticleBySlug(slug);

  if (!config) {
    notFound();
  }

  // Read the markdown file
  const markdownPath = path.join(process.cwd(), "domains/learn/articles", config.markdownFile);
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
      slug={slug}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        urlTransform={(url) => (url.startsWith("diagram:") ? url : defaultUrlTransform(url))}
      >
        {markdownContent}
      </ReactMarkdown>
    </ArticleLayout>
  );
}
