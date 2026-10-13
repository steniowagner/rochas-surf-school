"use client";

import { Moon, Sun } from "lucide-react";

import { useThemeToggle } from "./theme-toggle.hook";
import type { ThemeToggleProps } from "./theme-toggle.types";

export function ThemeToggle({ label }: ThemeToggleProps) {
  const { toggleTheme } = useThemeToggle();

  return (
    <button
      type="button"
      aria-label={label}
      onClick={toggleTheme}
      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-control border border-input-line bg-surface text-ink"
    >
      <Sun size={20} strokeWidth={2} className="theme-toggle-sun" aria-hidden />
      <Moon size={20} strokeWidth={2} className="theme-toggle-moon" aria-hidden />
    </button>
  );
}
