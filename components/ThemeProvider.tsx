"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { logger } from "@/lib/logger";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme: Theme = "dark";

    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      const body = window.document.body;
      root.classList.add("dark");
      body.classList.add("dark");
      localStorage.setItem("theme", initialTheme);
      logger.log('Applied dark class to html and body');
    }

    setTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    const body = window.document.body;
    root.classList.remove("light", "dark");
    body.classList.remove("light", "dark");
    root.classList.add(theme);
    body.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === "light" ? "dark" : "light";

      // Apply the new theme immediately
      if (typeof window !== "undefined") {
        const root = window.document.documentElement;
        const body = window.document.body;
        root.classList.remove("light", "dark");
        body.classList.remove("light", "dark");
        root.classList.add(newTheme);
        body.classList.add(newTheme);
        localStorage.setItem("theme", newTheme);
      }

      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
