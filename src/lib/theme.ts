export type Theme = "dark" | "light";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem("vp:theme") as Theme | null;
  return saved === "light" ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem("vp:theme", theme);
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}
