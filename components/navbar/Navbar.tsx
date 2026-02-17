"use client";

import Link from "next/link";
import type { NavbarProps } from "./types";
import { NavbarDesktop } from "./NavbarDesktop";
import { NavbarMobile } from "./NavbarMobile";
import { useIsMobile } from "@/hooks/useIsMobile";

export function Navbar({
  variant = "dark",
  hideIcon = false,
  hideOnMobile = false,
  pathname,
  userImageUrl,
  onClick,
  content,
}: NavbarProps) {
  const isLight = variant === "light";
  const isMobile = useIsMobile();

  // Hide navbar entirely on mobile when hideOnMobile
  if (isMobile && hideOnMobile) {
    return null;
  }

  // Render mobile menu on mobile
  if (isMobile) {
    return (
      <NavbarMobile
        variant={variant}
        pathname={pathname}
        userImageUrl={userImageUrl}
        onClick={onClick}
        content={content}
      />
    );
  }

  // Render desktop navbar
  return (
    <nav
      className={`${isLight ? "bg-white border-zinc-200" : "bg-zinc-900/95 border-zinc-800"} ${isLight ? "" : "backdrop-blur-sm"} border-b sticky top-0 z-50 safe-area-inset`}
    >
      <div className="flex items-center justify-between h-14 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div id="navbar-logo">
          {!hideIcon ? (
            <Link href={content.logo.href} className="hover:opacity-80 transition-opacity">
              <div id="navbar-logo-inner" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-emerald-400 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-zinc-900 font-bold text-sm">SD</span>
                </div>
                <span
                  className={`text-lg sm:text-xl font-bold leading-tight ${isLight ? "text-zinc-900" : "text-white"}`}
                >
                  {content.logo.full}
                </span>
              </div>
            </Link>
          ) : (
            <Link
              href={content.logo.href}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity md:hidden"
            >
              <div className="w-8 h-8 bg-emerald-400 text-zinc-900 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-sm">SD</span>
              </div>
              <span
                className={`text-lg font-bold whitespace-nowrap ${isLight ? "text-zinc-900" : "text-white"}`}
              >
                {content.logo.full}
              </span>
            </Link>
          )}
        </div>

        {/* Desktop Navigation */}
        <NavbarDesktop
          variant={variant}
          pathname={pathname}
          userImageUrl={userImageUrl}
          onClick={onClick}
          content={content}
        />
      </div>
    </nav>
  );
}
