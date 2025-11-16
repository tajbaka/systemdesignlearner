import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | System Design Sandbox",
  description:
    "Privacy Policy for System Design Sandbox - How we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: November 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to System Design Sandbox (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;).
              We respect your privacy and are committed to protecting your personal data. This
              privacy policy explains how we collect, use, disclose, and safeguard your information
              when you visit our website systemdesignsandbox.com and use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.1 Personal Information</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Email address (when you sign up or contact us)</li>
              <li>Account credentials (encrypted)</li>
              <li>Profile information (name, if provided)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              2.2 Automatically Collected Information
            </h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>IP address and device information</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent on pages</li>
              <li>Referring website</li>
              <li>Operating system</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">2.3 Usage Data</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Practice session data (designs created, scores, completion status)</li>
              <li>Feature usage and interaction patterns</li>
              <li>Performance data and error reports</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-3">We use the collected information for:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Providing and maintaining our service</li>
              <li>Authenticating users and managing accounts</li>
              <li>Personalizing your learning experience</li>
              <li>Analyzing usage patterns to improve our platform</li>
              <li>Sending administrative information and updates</li>
              <li>Detecting and preventing fraud or abuse</li>
              <li>Complying with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use cookies and similar tracking technologies to track activity on our service. We
              use:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Essential Cookies:</strong> Required for
                authentication and basic functionality
              </li>
              <li>
                <strong className="text-foreground">Analytics Cookies:</strong> PostHog analytics to
                understand how you use our platform
              </li>
              <li>
                <strong className="text-foreground">Performance Cookies:</strong> Vercel Analytics
                for performance monitoring
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              See our{" "}
              <Link href="/cookies" className="text-blue-400 hover:text-blue-300 underline">
                Cookie Policy
              </Link>{" "}
              for more details.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Third-Party Services</h2>
            <p className="text-muted-foreground mb-3">We use the following third-party services:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Clerk:</strong> Authentication and user
                management
              </li>
              <li>
                <strong className="text-foreground">PostHog:</strong> Product analytics and session
                recording
              </li>
              <li>
                <strong className="text-foreground">Vercel:</strong> Hosting and analytics
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              These services may collect information as governed by their respective privacy
              policies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell your personal information. We may share your information only in the
              following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>With service providers who assist in operating our platform</li>
              <li>To comply with legal obligations or respond to lawful requests</li>
              <li>To protect our rights, privacy, safety, or property</li>
              <li>In connection with a merger, sale, or acquisition (with notice to you)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational security measures to protect
              your personal data against unauthorized access, alteration, disclosure, or
              destruction. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Your Data Rights</h2>
            <p className="text-muted-foreground mb-3">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Access:</strong> Request a copy of your personal
                data
              </li>
              <li>
                <strong className="text-foreground">Correction:</strong> Request correction of
                inaccurate data
              </li>
              <li>
                <strong className="text-foreground">Deletion:</strong> Request deletion of your data
              </li>
              <li>
                <strong className="text-foreground">Portability:</strong> Receive your data in a
                structured format
              </li>
              <li>
                <strong className="text-foreground">Objection:</strong> Object to certain processing
                activities
              </li>
              <li>
                <strong className="text-foreground">Withdraw Consent:</strong> Withdraw consent
                where processing is based on consent
              </li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise these rights, please contact us using the information in the Contact
              section.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. California Privacy Rights (CCPA)</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you are a California resident, the California Consumer Privacy Act (CCPA) provides
              you with specific rights regarding your personal information.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              9.1 Categories of Personal Information We Collect
            </h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Identifiers:</strong> Email address, IP address,
                device identifiers
              </li>
              <li>
                <strong className="text-foreground">Internet Activity:</strong> Browsing history on
                our site, pages visited, interaction with our service
              </li>
              <li>
                <strong className="text-foreground">Geolocation Data:</strong> Approximate location
                based on IP address
              </li>
              <li>
                <strong className="text-foreground">Professional Information:</strong> System design
                practice data, session results, scores
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.2 How We Use Personal Information</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We use the categories of personal information listed above for the following business
              purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Operating and improving our service</li>
              <li>Personalizing your experience</li>
              <li>Analytics and performance monitoring</li>
              <li>Communicating with you about our service</li>
              <li>Security and fraud prevention</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.3 Your California Privacy Rights</h3>
            <p className="text-muted-foreground mb-3">California residents have the right to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Know:</strong> Request disclosure of the
                categories and specific pieces of personal information we collect, use, disclose,
                and sell
              </li>
              <li>
                <strong className="text-foreground">Delete:</strong> Request deletion of your
                personal information
              </li>
              <li>
                <strong className="text-foreground">Opt-Out:</strong> Opt out of the sale of
                personal information (Note: We do not sell personal information)
              </li>
              <li>
                <strong className="text-foreground">Non-Discrimination:</strong> Not be
                discriminated against for exercising your CCPA rights
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">
              9.4 We Do Not Sell Your Personal Information
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, rent, or share your personal information with third parties for their
              direct marketing purposes. We do not sell personal information of minors under 16
              years of age.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.5 How to Exercise Your Rights</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To exercise your CCPA rights, please contact us at{" "}
              <a
                href="mailto:privacy@systemdesignsandbox.com"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                privacy@systemdesignsandbox.com
              </a>{" "}
              with the subject line &quot;California Privacy Rights Request.&quot; We will verify
              your identity before processing your request and respond within 45 days.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">9.6 Authorized Agent</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may designate an authorized agent to make a request on your behalf. We will
              require written proof that the agent is authorized to act on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal data only for as long as necessary to fulfill the purposes
              outlined in this policy, unless a longer retention period is required by law. When you
              delete your account, we will delete or anonymize your personal data within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our service is not intended for children under 13 years of age. We do not knowingly
              collect personal information from children under 13. If you are a parent or guardian
              and believe your child has provided us with personal data, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your information may be transferred to and maintained on servers located outside of
              your state, province, country, or other governmental jurisdiction where data
              protection laws may differ. We ensure appropriate safeguards are in place for such
              transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. We will notify you of any changes
              by posting the new policy on this page and updating the &quot;Last Updated&quot; date.
              You are advised to review this policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:{" "}
              <a
                href="mailto:privacy@systemdesignsandbox.com"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                privacy@systemdesignsandbox.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
