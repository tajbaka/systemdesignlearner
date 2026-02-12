import { Metadata } from "next";
import Link from "next/link";
import { ORGANIZATION_SCHEMA, BASE_URL } from "@/lib/schemas";

export const metadata: Metadata = {
  title: "Contact | System Design Sandbox",
  description:
    "Get in touch with the System Design Sandbox team. Reach out for feedback, questions, or partnership inquiries.",
  alternates: {
    canonical: "https://www.systemdesignsandbox.com/contact",
  },
  openGraph: {
    title: "Contact | System Design Sandbox",
    description:
      "Get in touch with the System Design Sandbox team. Reach out for feedback, questions, or partnership inquiries.",
    type: "website",
  },
};

export default function ContactPage() {
  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact System Design Sandbox",
    description:
      "Get in touch with the System Design Sandbox team for feedback, questions, or partnership inquiries.",
    url: `${BASE_URL}/contact`,
    mainEntity: {
      ...ORGANIZATION_SCHEMA,
    },
  };

  return (
    <>
      <script
        id="contact-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }}
      />
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Home
          </Link>

          <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
          <p className="text-muted-foreground mb-8">We&apos;d love to hear from you</p>

          <div className="prose prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
              <p className="text-muted-foreground leading-relaxed">
                Whether you have feedback on a practice scenario, a question about system design
                concepts, or a partnership inquiry — we want to hear from you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Ways to Reach Us</h2>
              <div className="space-y-6">
                <div className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Product Feedback</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Have a suggestion or found a bug? Use our{" "}
                    <Link
                      href="/feedback"
                      className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-2 transition-colors"
                    >
                      feedback page
                    </Link>{" "}
                    to let us know directly.
                  </p>
                </div>

                <div className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Social Media</h3>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Follow us and reach out on social media:
                  </p>
                  <ul className="text-muted-foreground space-y-2">
                    <li>
                      <a
                        href="https://www.instagram.com/systemdesignsandbox/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-2 transition-colors"
                      >
                        Instagram — @systemdesignsandbox
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://www.linkedin.com/in/antonio-coppe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 underline decoration-emerald-500/30 underline-offset-2 transition-colors"
                      >
                        LinkedIn — Antonio Coppe
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="bg-zinc-800/40 border border-zinc-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">General Inquiries</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    For partnership opportunities, press inquiries, or anything else, reach out to
                    us through our social media channels or the feedback page and we&apos;ll get
                    back to you as soon as possible.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
