"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  const isOnSandbox = pathname === "/play";

  return (
    <nav className="flex items-center justify-between p-6 lg:px-8">
      <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center">
          <span className="text-zinc-900 font-bold text-sm">SD</span>
        </div>
        <span className="text-xl font-bold text-white">System Design Sandbox</span>
      </Link>
      <div className="flex items-center space-x-4">
        <Link
          href="/practice"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Practice
        </Link>
        <Link
          href="/docs"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Docs
        </Link>
        <Link
          href="/feedback"
          className="text-zinc-300 hover:text-white transition-colors"
        >
          Feedback
        </Link>
        {isOnSandbox ? (
          <div className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium cursor-default">
            Sandbox Active
          </div>
        ) : (
          <Link
            href="/play"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg font-medium transition-colors"
          >
            Try Sandbox
          </Link>
        )}
      </div>
    </nav>
  );
}
