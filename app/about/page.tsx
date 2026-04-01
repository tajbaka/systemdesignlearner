import { Metadata } from "next";
import Link from "next/link";
import { ORGANIZATION_SCHEMA, BASE_URL } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "About | System Design Learner",
  description:
    "Learn about System Design Learner — an interactive platform for practicing system design interviews with AI-powered feedback.",
  alternates: {
    canonical: "https://www.systemdesignlearner.com/about",
  },
  openGraph: {
    title: "About | System Design Learner",
    description:
      "Learn about System Design Learner — an interactive platform for practicing system design interviews with AI-powered feedback.",
    type: "website",
  },
};

export default function AboutPage() {
  const aboutSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About System Design Learner",
    description:
      "Learn about System Design Learner — an interactive platform for practicing system design interviews with AI-powered feedback.",
    url: `${BASE_URL}/about`,
    mainEntity: {
      ...ORGANIZATION_SCHEMA,
    },
  };

  return (
    <>
      <script
        id="about-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Home
          </Link>

          <h1 className="text-4xl font-bold mb-2">About System Design Learner</h1>
          <p className="text-muted-foreground mb-8">
            Interactive system design interview practice for engineers
          </p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                System Design Learner exists to make system design interview preparation accessible,
                interactive, and effective. We believe the best way to learn system design is by
                doing it — not just reading about it.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Traditional preparation involves reading blog posts, watching videos, and hoping you
                remember enough when the interview arrives. We built a platform where you can
                practice designing real systems step-by-step and get feedback on your approach.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">What We Offer</h2>
              <ul className="text-muted-foreground leading-relaxed space-y-3 list-disc list-inside">
                <li>
                  <strong className="text-foreground">Interactive Practice Scenarios</strong> —
                  Design systems like URL shorteners, messaging apps, and notification systems from
                  scratch with guided steps.
                </li>
                <li>
                  <strong className="text-foreground">AI-Powered Feedback</strong> — Get instant,
                  detailed feedback on your designs to understand what you got right and what needs
                  improvement.
                </li>
                <li>
                  <strong className="text-foreground">Comprehensive Learning Guides</strong> —
                  Deep-dive articles covering distributed systems, caching, databases, scaling, and
                  more.
                </li>
                <li>
                  <strong className="text-foreground">Completely Free</strong> — All practice
                  scenarios, articles, and feedback are available at no cost.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Who Built This</h2>
              <p className="text-muted-foreground leading-relaxed">
                System Design Learner was created by a software engineer who saw firsthand how
                difficult it is to practice system design without a structured environment. After
                going through the interview process and finding no equivalent of LeetCode for system
                design, the decision was clear: build one.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Our Approach</h2>
              <p className="text-muted-foreground leading-relaxed">
                Every practice scenario follows the same structure you would encounter in a real
                interview: define functional requirements, outline non-functional requirements,
                design the API, and build out the high-level architecture. This mirrors how
                experienced engineers approach system design in production.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                The platform is built with Next.js, deployed on Vercel, and designed for performance
                — because an engineering tool should practice what it preaches.
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
