"use client";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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
      logger.error('Feedback submission error:', error);
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
          <p className="text-xl text-zinc-300 mb-3">
            We&apos;d love to hear your thoughts. Tell us what worked, what didn&apos;t, and what you&apos;d like to see next.
          </p>
          <p className="text-sm text-zinc-400">
            Prefer email? Reach us at{" "}
            <a href="mailto:support@systemdesignsandbox.com" className="text-emerald-400 hover:text-emerald-300 underline">
              support@systemdesignsandbox.com
            </a>
          </p>
        </div>

        {/* Form */}
        <Card className="bg-zinc-800/50 border-zinc-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Share Your Feedback</CardTitle>
            <CardDescription className="text-zinc-400">
              Help us improve by sharing your experience and suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-zinc-300">First name</Label>
                  <Input
                    type="text"
                    id="firstName"
                    name="firstName"
                    placeholder="First name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-zinc-300">Last name (optional)</Label>
                  <Input
                    type="text"
                    id="lastName"
                    name="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-300">Email</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="your@email.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="question" className="text-zinc-300">Your feedback or question</Label>
                <Textarea
                  id="question"
                  name="question"
                  placeholder="Tell us what you think..."
                  rows={4}
                  required
                  value={formData.question}
                  onChange={handleChange}
                  className="bg-zinc-700 border-zinc-600 text-white placeholder-zinc-400 focus:border-emerald-500 focus:ring-emerald-500 resize-vertical"
                />
              </div>

              {/* Consent Checkboxes */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="contact_ok"
                    checked={formData.contact_ok}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, contact_ok: checked as boolean }));
                    }}
                    className="mt-1 border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <Label htmlFor="contact_ok" className="text-sm text-zinc-300 font-normal cursor-pointer">
                    <strong>It&apos;s okay to contact me</strong> about this feedback for clarification or follow-up questions.
                  </Label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="marketing_ok"
                    checked={formData.marketing_ok}
                    onCheckedChange={(checked) => {
                      setFormData(prev => ({ ...prev, marketing_ok: checked as boolean }));
                    }}
                    className="mt-1 border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <Label htmlFor="marketing_ok" className="text-sm text-zinc-300 font-normal cursor-pointer">
                    <strong>Subscribe me to updates</strong> about new features, product announcements, and system design content.
                  </Label>
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

              <Button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium transition-colors"
              >
                {status === 'submitting' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback →'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
