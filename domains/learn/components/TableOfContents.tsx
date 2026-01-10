"use client";

import { MouseEvent, useEffect } from "react";

interface TableOfContentsProps {
  items: Array<{ id: string; title: string }>;
}

const scrollToElement = (id: string, animate = false, retries = 3) => {
  const element = document.getElementById(id);

  if (element) {
    // Calculate the position with offset for better visual spacing
    // Use smaller offset on mobile devices
    const isMobile = window.innerWidth < 768;
    const offset = isMobile ? 60 : 100;

    // Use getBoundingClientRect with scrollY for accurate position calculation
    // This works reliably regardless of current scroll position
    const rect = element.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    const elementPosition = rect.top + scrollY;

    // Ensure we don't scroll to negative position
    const offsetPosition = Math.max(0, elementPosition - offset);

    // Scroll to the calculated position
    window.scrollTo({
      top: offsetPosition,
      behavior: animate ? "smooth" : "auto",
    });
  } else if (retries > 0) {
    // Retry if element not found (might still be rendering)
    setTimeout(() => scrollToElement(id, animate, retries - 1), 100);
  }
};

export function TableOfContents({ items }: TableOfContentsProps) {
  // Handle initial page load with hash in URL
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the '#' character
    if (hash) {
      // Use multiple requestAnimationFrame calls to ensure layout is stable
      // This is especially important when starting at the top of the page
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToElement(hash);
        });
      });
    }
  }, []);

  // Handle hash changes (e.g., browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        requestAnimationFrame(() => {
          scrollToElement(hash);
        });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    // Update the URL hash
    window.history.pushState(null, "", `#${id}`);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      scrollToElement(id, true); // Animate on click
    });
  };

  return (
    <div className="mb-12">
      <h3 className="mb-5 text-[16px] font-bold text-zinc-700">Content of this blog</h3>
      <nav>
        <ul className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-start gap-2">
              <span className="text-zinc-500 font-medium">{index + 1}.</span>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                className="text-[16px] text-zinc-700 hover:text-zinc-900 underline decoration-zinc-400 underline-offset-2 hover:decoration-zinc-600 transition-colors cursor-pointer"
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
