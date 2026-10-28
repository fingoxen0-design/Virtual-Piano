import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTheme, applyTheme, type Theme } from "@/lib/theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const current = getTheme();
    setThemeState(current);
    applyTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    applyTheme(next);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className={`relative size-8 rounded-lg text-neutral-400 hover:text-neutral-100 dark:hover:text-neutral-100 ${className ?? ""}`}
      title={theme === "dark" ? "Kunduzgi rejimga o'tish" : "Tungi rejimga o'tish"}
      aria-label="Toggle theme"
    >
      <Sun
        className={`size-4 transition-all duration-300 ${
          theme === "light"
            ? "rotate-0 scale-100 text-amber-500"
            : "-rotate-90 scale-0 text-neutral-400"
        }`}
      />
      <Moon
        className={`absolute size-4 transition-all duration-300 ${
          theme === "dark"
            ? "rotate-0 scale-100 text-neutral-200"
            : "rotate-90 scale-0 text-neutral-400"
        }`}
      />
    </Button>
  );
}
