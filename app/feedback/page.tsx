"use client";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    question: "",
    contact_ok: false,
    marketing_ok: false,
  });
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: `${formData.firstName} ${formData.lastName || ''}`.trim(),
          feedback: formData.question,
          contact_ok: formData.contact_ok,
          marketing_ok: formData.marketing_ok,
          source: 'feedback-page'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit feedback');
      }

      setStatus('success');
      setMessage('Thank you for your feedback!');
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        question: "",
        contact_ok: false,
        marketing_ok: false,
      });

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    } catch (error) {
      console.error('Feedback submission error:', error);
      setStatus('error');
      setMessage('Failed to submit feedback. Please try again.');

      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">Feedback</h1>
          <p className="text-xl text-zinc-300">
            We&apos;d love to hear your thoughts. Tell us what worked, what didn&apos;t, and what you&apos;d like to see next.
          </p>
        </div>

        {/* Form */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-4">Share Your Feedback</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-600 bg-transparent px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last name (optional)"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-600 bg-transparent px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-md border border-zinc-600 bg-transparent px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />

            <textarea
              name="question"
              placeholder="Your feedback or question"
              rows={4}
              required
              value={formData.question}
              onChange={handleChange}
              className="w-full rounded-md border border-zinc-600 bg-transparent px-3 py-2 text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />

            {/* Consent Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="contact_ok"
                  name="contact_ok"
                  checked={formData.contact_ok}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-zinc-600 bg-transparent text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="contact_ok" className="text-sm text-zinc-300">
                  <strong>It&apos;s okay to contact me</strong> about this feedback for clarification or follow-up questions.
                </label>
              </div>

              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="marketing_ok"
                  name="marketing_ok"
                  checked={formData.marketing_ok}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-zinc-600 bg-transparent text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="marketing_ok" className="text-sm text-zinc-300">
                  <strong>Subscribe me to updates</strong> about new features, product announcements, and system design content.
                </label>
              </div>
            </div>

            {/* Status Messages */}
            {message && (
              <div className={`p-3 rounded-md text-sm ${
                status === 'success'
                  ? 'bg-green-900/50 border border-green-700 text-green-300'
                  : 'bg-red-900/50 border border-red-700 text-red-300'
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex items-center rounded-md bg-emerald-600 px-5 py-2 text-white font-medium hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              {status === 'submitting' ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                'Submit Feedback →'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
