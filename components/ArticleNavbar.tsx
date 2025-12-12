"use client";

import Link from "next/link";
import { UserButton, SignedIn } from "@clerk/nextjs";

export function ArticleNavbar() {
  return (
    <nav className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="mx-auto flex items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">SD</span>
            </div>
            <span className="text-lg font-bold text-zinc-900 hidden sm:block">
              System Design Sandbox
            </span>
            <span className="text-lg font-bold text-zinc-900 sm:hidden">SDS</span>
          </div>
        </Link>

        {/* Right Side - CTA + Profile */}
        <div className="flex items-center gap-4">
          <Link
            href="/practice/url-shortener/intro"
            className="inline-flex items-center justify-center whitespace-nowrap h-9 rounded-md px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors"
          >
            Start Practicing
          </Link>

          {/* User Button */}
          <SignedIn>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 border-0",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
