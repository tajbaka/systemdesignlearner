import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribe | System Design Sandbox",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        {success === "true" ? (
          <>
            <h1 className="mb-4 text-2xl font-bold">Unsubscribed</h1>
            <p className="mb-8 text-muted-foreground">
              You&rsquo;ve been unsubscribed from new problem notifications. You won&rsquo;t receive
              these emails anymore.
            </p>
          </>
        ) : error ? (
          <>
            <h1 className="mb-4 text-2xl font-bold">Invalid Link</h1>
            <p className="mb-8 text-muted-foreground">
              This unsubscribe link is invalid or has expired. If you&rsquo;d like to unsubscribe,
              please use the link from a recent email.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-4 text-2xl font-bold">Unsubscribe</h1>
            <p className="mb-8 text-muted-foreground">
              Use the link in your email to manage your notification preferences.
            </p>
          </>
        )}
        <Link href="/" className="text-sm text-emerald-500 hover:text-emerald-400 underline">
          Back to System Design Sandbox
        </Link>
      </div>
    </div>
  );
}
