"use client";

import { useEffect, useCallback, MouseEvent } from "react";

const scrollToElement = (id: string, animate = false, retries = 3) => {
  const element = document.getElementById(id);

  if (element) {
    const isMobile = window.innerWidth < 768;
    const offset = isMobile ? 60 : 100;

    const rect = element.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
    const elementPosition = rect.top + scrollY;
    const offsetPosition = Math.max(0, elementPosition - offset);

    window.scrollTo({
      top: offsetPosition,
      behavior: animate ? "smooth" : "auto",
    });
  } else if (retries > 0) {
    setTimeout(() => scrollToElement(id, animate, retries - 1), 100);
  }
};

export function useTableOfContents() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToElement(hash);
        });
      });
    }
  }, []);

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

  const handleClick = useCallback((e: MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    window.history.pushState(null, "", `#${id}`);
    requestAnimationFrame(() => {
      scrollToElement(id, true);
    });
  }, []);

  return { handleClick };
}
