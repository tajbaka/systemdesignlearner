"use client";
import { useState } from "react";
import { Navbar } from "@/components/Navbar";

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    question: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 👉 Replace this with your backend API call (Supabase/Next API route/etc.)
    console.log("Form submitted:", formData);
    alert("Thanks for your feedback!");
    setFormData({ firstName: "", lastName: "", phone: "", email: "", question: "" });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-white mb-4">Feedback</h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            We&apos;d love to hear your thoughts. Tell us what worked, what didn&apos;t, and what you&apos;d like to see next.
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4">Contact form</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                name="firstName"
                placeholder="First name"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              <input
                type="text"
                name="lastName"
                placeholder="Last name"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="tel"
                name="phone"
                placeholder="Phone number"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>

            <textarea
              name="question"
              placeholder="Your question"
              rows={4}
              required
              value={formData.question}
              onChange={handleChange}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            />

            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-black px-5 py-2 text-white font-medium hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              Submit →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
