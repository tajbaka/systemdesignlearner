import { useState } from "react";
import Link from "next/link";
import type { NavbarContent } from "./types";

interface NavbarMobileProps {
  variant: "dark" | "light";
  pathname: string;
  userImageUrl?: string;
  onClick: () => void;
  content: NavbarContent;
}

export function NavbarMobile({
  variant,
  pathname,
  userImageUrl,
  onClick,
  content,
}: NavbarMobileProps) {
  const isLight = variant === "light";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  // Theme classes
  const bgClass = isLight ? "bg-white" : "bg-zinc-900";
  const borderClass = isLight ? "border-zinc-200" : "border-zinc-800";
  const textClass = isLight ? "text-zinc-900" : "text-white";
  const textMutedClass = isLight ? "text-zinc-700" : "text-zinc-300";
  const bgHoverClass = isLight ? "hover:bg-zinc-100" : "hover:bg-zinc-800";
  const buttonBgClass = isLight
    ? "bg-white border-zinc-200"
    : "bg-zinc-900/95 border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800";
  const backdropClass = isLight ? "bg-black/40" : "bg-black/60";
  const activeTextClass = isLight ? "text-emerald-600" : "text-emerald-400";
  const activeBgClass = isLight ? "bg-emerald-50" : "bg-emerald-500/20";

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={toggleMenu}
        className={`fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg border shadow-md transition-all ${buttonBgClass} ${
          isMenuOpen ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-label="Toggle navigation"
      >
        <svg
          className={`h-6 w-6 ${isLight ? "text-zinc-700" : "text-zinc-300"}`}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop */}
      {isMenuOpen && (
        <div
          className={`fixed inset-0 z-40 ${backdropClass} backdrop-blur-sm`}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navbar */}
      <nav
        className={`fixed inset-0 z-50 ${bgClass} transition-transform duration-300 ${
          isMenuOpen ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          {/* Mobile Header */}
          <div
            className={`flex items-center justify-between border-b ${borderClass} p-4 flex-shrink-0`}
          >
            <Link
              href={content.logo.href}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              onClick={closeMenu}
            >
              <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-zinc-900 font-bold text-sm">SD</span>
              </div>
              <span className={`text-lg font-bold ${textClass} whitespace-nowrap`}>
                {content.logo.full}
              </span>
            </Link>
            <button
              onClick={closeMenu}
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${bgHoverClass} transition-colors`}
              aria-label="Close navigation"
            >
              <svg
                className={`h-6 w-6 ${isLight ? "text-zinc-700" : "text-zinc-300"}`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <Link
                href={content.links.practice.href}
                className={`block px-3 py-3 rounded-lg transition-colors text-base font-medium ${
                  pathname.startsWith(content.links.practice.href)
                    ? `${activeBgClass} ${activeTextClass}`
                    : `${textMutedClass} ${bgHoverClass}`
                }`}
                onClick={closeMenu}
              >
                {content.links.practice.label}
              </Link>
              <Link
                href={content.links.learn.href}
                className={`block px-3 py-3 rounded-lg transition-colors text-base font-medium ${
                  pathname.startsWith(content.links.learn.href)
                    ? `${activeBgClass} ${activeTextClass}`
                    : `${textMutedClass} ${bgHoverClass}`
                }`}
                onClick={closeMenu}
              >
                {content.links.learn.label}
              </Link>

              {/* Mobile User Button / Sign In */}
              {userImageUrl ? (
                <button
                  onClick={() => {
                    onClick();
                    closeMenu();
                  }}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg `}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={userImageUrl} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <span className={`text-sm font-medium ${textMutedClass}`}>
                    {content.auth.accountLabel}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    onClick();
                    closeMenu();
                  }}
                  className={`w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isLight
                      ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-emerald-200"
                      : "text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800 border border-emerald-500/30"
                  }`}
                >
                  {content.auth.signInLabel}
                </button>
              )}
            </div>

            <div className="space-y-2">
              {content.cta && (
                <Link
                  href={content.cta.href}
                  className="flex items-center justify-center gap-2 h-11 rounded-lg px-4 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 w-full"
                  onClick={closeMenu}
                >
                  {content.cta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
