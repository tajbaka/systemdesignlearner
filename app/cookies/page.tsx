import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy | System Design Sandbox",
  description: "Cookie Policy for System Design Sandbox - How we use cookies and tracking technologies.",
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link
          href="/"
          className="mb-8 inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Home
        </Link>

        <h1 className="text-4xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-muted-foreground mb-8">Last Updated: November 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners. Cookies help us understand how you use our service and improve your experience.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              System Design Sandbox uses cookies and similar tracking technologies to provide, improve, protect, and promote our Service. Below is a detailed breakdown of the types of cookies we use and their purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Types of Cookies We Use</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.1 Essential Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These cookies are strictly necessary for the Service to function. Without these cookies, certain features would not work.
            </p>
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div>
                <p className="font-semibold text-foreground">Authentication Cookies (Clerk)</p>
                <p className="text-sm text-muted-foreground">Purpose: Manage user sessions and keep you logged in</p>
                <p className="text-sm text-muted-foreground">Duration: Session or persistent (based on &quot;Remember me&quot;)</p>
                <p className="text-sm text-muted-foreground">Provider: Clerk.com</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.2 Analytics Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These cookies help us understand how visitors interact with our Service by collecting and reporting information anonymously.
            </p>

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div>
                  <p className="font-semibold text-foreground">PostHog Analytics</p>
                  <p className="text-sm text-muted-foreground">Purpose: Track user behavior, feature usage, and performance metrics</p>
                  <p className="text-sm text-muted-foreground">Duration: 1 year</p>
                  <p className="text-sm text-muted-foreground">Provider: PostHog Inc.</p>
                  <p className="text-sm text-muted-foreground">Data Collected: Page views, clicks, session recordings, user properties</p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                <div>
                  <p className="font-semibold text-foreground">Vercel Analytics</p>
                  <p className="text-sm text-muted-foreground">Purpose: Performance monitoring and web vitals</p>
                  <p className="text-sm text-muted-foreground">Duration: Session</p>
                  <p className="text-sm text-muted-foreground">Provider: Vercel Inc.</p>
                  <p className="text-sm text-muted-foreground">Data Collected: Performance metrics, page load times</p>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.3 Functional Cookies</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              These cookies enable enhanced functionality and personalization.
            </p>
            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
              <div>
                <p className="font-semibold text-foreground">Theme Preferences</p>
                <p className="text-sm text-muted-foreground">Purpose: Remember your dark/light mode preference</p>
                <p className="text-sm text-muted-foreground">Duration: 1 year</p>
                <p className="text-sm text-muted-foreground">Provider: First-party (System Design Sandbox)</p>
              </div>
            </div>

            <h3 className="text-xl font-semibold mb-3 mt-6">3.4 Local Storage</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              In addition to cookies, we use browser local storage to enhance your experience:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>Practice session progress and autosave data</li>
              <li>User preferences and settings</li>
              <li>Cached content for faster loading</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Some cookies are placed by third-party services that appear on our pages. We do not control these cookies. The third parties include:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Clerk:</strong> Authentication services - <a href="https://clerk.com/privacy" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong className="text-foreground">PostHog:</strong> Analytics platform - <a href="https://posthog.com/privacy" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><strong className="text-foreground">Vercel:</strong> Hosting and analytics - <a href="https://vercel.com/legal/privacy-policy" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Session Recording</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use PostHog to record user sessions (screen recordings of how you interact with our Service). These recordings help us identify usability issues and improve the user experience. Session recordings never capture sensitive form inputs like passwords or payment information. You can opt out of session recording by enabling &quot;Do Not Track&quot; in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. How to Manage Cookies</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.1 Browser Settings</h3>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Most web browsers allow you to manage cookie preferences through browser settings. You can:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Please note that blocking or deleting cookies may impact the functionality of our Service.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.2 Browser-Specific Instructions</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Firefox</a></li>
              <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">Edge</a></li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">6.3 Do Not Track</h3>
            <p className="text-muted-foreground leading-relaxed">
              We respect &quot;Do Not Track&quot; browser settings. When enabled, we will not track your session or record your interactions with PostHog.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookie data is retained for the following periods:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mt-3">
              <li><strong className="text-foreground">Session cookies:</strong> Deleted when you close your browser</li>
              <li><strong className="text-foreground">Authentication cookies:</strong> Up to 30 days or until you log out</li>
              <li><strong className="text-foreground">Analytics cookies:</strong> Up to 1 year</li>
              <li><strong className="text-foreground">Preference cookies:</strong> Up to 1 year</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. GDPR and Privacy Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you are located in the European Economic Area (EEA), you have certain rights regarding your personal data collected through cookies. Please see our{" "}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                Privacy Policy
              </Link>{" "}
              for more information about your rights and how to exercise them.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Cookie Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by posting the updated policy on this page with a new &quot;Last Updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact us at:{" "}
              <a href="mailto:privacy@systemdesignsandbox.com" className="text-blue-400 hover:text-blue-300 underline">
                privacy@systemdesignsandbox.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
