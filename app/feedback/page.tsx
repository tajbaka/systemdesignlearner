export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-4">Feedback</h1>
        <p className="text-zinc-300 mb-8">
          We’d love to hear your thoughts. Tell us what worked, what didn’t, and what you’d like to see next.
        </p>

        <div className="space-y-4">
          <a
            href="https://tally.so/r/w5x6m1" // replace with your form URL
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
          >
            Open Feedback Form
          </a>

          <div className="text-sm text-zinc-400">
            Prefer email? <a className="text-emerald-300 hover:text-emerald-200" href="mailto:hello@yourdomain.com?subject=System%20Design%20Sandbox%20Feedback">hello@yourdomain.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}
