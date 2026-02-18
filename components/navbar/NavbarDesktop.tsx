import Link from "next/link";
import { getNavLinkClasses, type NavbarContent } from "./types";
import { ReadinessPill } from "./ReadinessPill";

interface NavbarDesktopProps {
  variant: "dark" | "light";
  pathname: string;
  userImageUrl?: string;
  onClick: () => void;
  content: NavbarContent;
}

export function NavbarDesktop({
  variant,
  pathname,
  userImageUrl,
  onClick,
  content,
}: NavbarDesktopProps) {
  const isLight = variant === "light";

  return (
    <div className="hidden md:flex items-center space-x-6">
      <Link
        prefetch={false}
        href={content.links.practice.href}
        className={`px-3 py-2 transition-colors text-sm font-medium rounded-lg ${getNavLinkClasses(pathname.startsWith(content.links.practice.href), isLight)}`}
      >
        {content.links.practice.label}
      </Link>
      <Link
        href={content.links.learn.href}
        className={`px-3 py-2 transition-colors text-sm font-medium rounded-lg ${getNavLinkClasses(pathname.startsWith(content.links.learn.href), isLight)}`}
      >
        {content.links.learn.label}
      </Link>

      <ReadinessPill variant="desktop" theme={variant} />

      {userImageUrl ? (
        <button
          onClick={onClick}
          className="w-9 h-9 rounded-full overflow-hidden hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={userImageUrl} alt="Profile" className="w-full h-full object-cover" />
        </button>
      ) : (
        <button
          onClick={onClick}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isLight
              ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              : "text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800"
          }`}
        >
          {content.auth.signInLabel}
        </button>
      )}
    </div>
  );
}
