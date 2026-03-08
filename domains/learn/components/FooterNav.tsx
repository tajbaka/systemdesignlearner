import Link from "next/link";

interface FooterLink {
  href: string;
  label: string;
  prefetch?: boolean;
}

interface FooterNavProps {
  leftLinks: FooterLink[];
  rightLinks: FooterLink[];
  className?: string;
}

export function FooterNav({ leftLinks, rightLinks, className }: FooterNavProps) {
  return (
    <footer className={`border-t border-zinc-200 bg-white ${className ?? ""}`}>
      <div className="mx-auto max-w-[760px] px-8 py-8 sm:px-12">
        <div className="flex items-center justify-between text-sm text-zinc-600">
          <div className="flex flex-wrap items-center gap-3">
            {leftLinks.map((link, i) => (
              <span key={link.href} className="flex items-center gap-3">
                {i > 0 && <span>·</span>}
                <Link
                  href={link.href}
                  prefetch={link.prefetch ?? true}
                  className={`transition-colors ${i === 0 ? "text-zinc-900 hover:text-zinc-600" : "hover:text-zinc-900"}`}
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {rightLinks.map((link, i) => (
              <span key={link.href} className="flex items-center gap-3">
                {i > 0 && <span>·</span>}
                <Link
                  href={link.href}
                  prefetch={link.prefetch ?? true}
                  className="transition-colors hover:text-zinc-900"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
