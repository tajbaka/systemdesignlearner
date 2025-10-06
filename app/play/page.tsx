"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "../../components/Navbar";

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
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <SystemDesignEditor />
      </main>
    </div>
  );
}
