"use client";

import dynamic from "next/dynamic";

const SystemDesignEditor = dynamic(() => import("../components/SystemDesignEditor"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
        <p className="text-zinc-400">Loading System Design Sandbox...</p>
      </div>
    </div>
  ),
});

export default function PlayPage() {
  return (
    <main className="h-screen overflow-hidden">
      <SystemDesignEditor />
    </main>
  );
}
