import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "review-note:theme";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getSystemTheme(): Theme {
  if (!isBrowser()) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
  if (!isBrowser()) return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : getSystemTheme();
}

function applyTheme(theme: Theme) {
  if (!isBrowser()) return;
  document.documentElement.dataset.theme = theme;
}

interface ThemeStore {
  theme: Theme;
  toggleTheme: () => void;
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: initialTheme,
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    if (isBrowser()) localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    set({ theme: next });
  },
}));
