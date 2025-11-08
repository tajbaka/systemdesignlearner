import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | System Design Sandbox",
  description: "Terms of Service for System Design Sandbox - Rules and guidelines for using our platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last Updated: November 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using System Design Sandbox (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you disagree with any part of these terms, you do not have permission to access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              System Design Sandbox is an interactive learning platform that provides hands-on practice with system design concepts through visual simulations and real-world scenarios. The Service includes practice exercises, design tools, and educational content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Account Creation</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To use certain features, you must create an account. You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Account Eligibility</h3>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 13 years old to use this Service. By using the Service, you represent that you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">4.1 Permitted Use</h3>
            <p className="text-muted-foreground leading-relaxed">
              You may use the Service for lawful educational and professional development purposes in accordance with these Terms.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">4.2 Prohibited Activities</h3>
            <p className="text-muted-foreground mb-3">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Transmit harmful code, viruses, or malware</li>
              <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Use automated systems (bots, scrapers) without permission</li>
              <li>Impersonate another person or entity</li>
              <li>Share your account with others</li>
              <li>Reverse engineer or attempt to extract source code</li>
              <li>Use the Service for commercial purposes without authorization</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property</h2>
            <h3 className="text-xl font-semibold mb-3 mt-6">5.1 Our Content</h3>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by System Design Sandbox and are protected by international copyright, trademark, and other intellectual property laws.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.2 Your Content</h3>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of any system designs, diagrams, or content you create using the Service (&quot;Your Content&quot;). By using the Service, you grant us a limited license to store, display, and process Your Content solely to provide the Service to you.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">5.3 Feedback</h3>
            <p className="text-muted-foreground leading-relaxed">
              Any feedback, suggestions, or ideas you provide about the Service may be used by us without any obligation to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </Link>
              . Please review it to understand our data practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We strive to provide reliable service, but we do not guarantee:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>The Service will be uninterrupted, secure, or error-free</li>
              <li>The results obtained from the Service will be accurate or reliable</li>
              <li>Any errors will be corrected</li>
              <li>The Service will be available at any particular time or location</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              We reserve the right to modify, suspend, or discontinue the Service at any time with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Breach of these Terms</li>
              <li>At your request</li>
              <li>Fraudulent, abusive, or illegal activity</li>
              <li>Extended periods of inactivity</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Upon termination, your right to use the Service will cease immediately. You may delete your account at any time through your account settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL MEET YOUR REQUIREMENTS OR THAT IT WILL BE SUITABLE FOR ANY PARTICULAR PURPOSE.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, SYSTEM DESIGN SANDBOX SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
              <li>Your use or inability to use the Service</li>
              <li>Unauthorized access to or alteration of your data</li>
              <li>Any conduct or content of third parties on the Service</li>
              <li>Any content obtained from the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless System Design Sandbox and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including legal fees) arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts located in the United States.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days&apos; notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. Your continued use of the Service after changes become effective constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Severability</h2>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, and the remaining provisions will continue in full force and effect.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at:{" "}
              <a href="mailto:legal@systemdesignsandbox.com" className="text-blue-400 hover:text-blue-300 underline">
                legal@systemdesignsandbox.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
