"use client";

import { useCallback } from "react";

export const useScrollToTop = () => {
  return useCallback(() => {
    if (typeof window === "undefined") return;

    if (typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const main = document.querySelector("main");
    if (main) {
      const target = main as HTMLElement;
      if (typeof target.scrollTo === "function") {
        target.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        target.scrollTop = 0;
      }
    }
  }, []);
};

export default useScrollToTop;
