"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "dark" | "light";

type ThemeContextValue = {
  theme: ThemeMode;
  isLight: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemeMode;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("erp-theme", theme);
    document.cookie = `erp-theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.remove("theme-light", "theme-dark");
    document.documentElement.classList.add(theme === "light" ? "theme-light" : "theme-dark");
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isLight: theme === "light",
      setTheme,
      toggleTheme: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeMode deve ser usado dentro de ThemeProvider.");
  }
  return context;
}
