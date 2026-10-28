import { Link, useRouterState } from "@tanstack/react-router";
import { Music2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const navLinks = [
    { to: "/", label: "Bosh sahifa" },
    { to: "/play", label: "Pianino" },
    { to: "/songs", label: "Notalar" },
    { to: "/learn", label: "Qo'llanma" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md transition-colors duration-200">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <span className="grid size-8 place-items-center rounded-lg bg-neutral-800 border border-neutral-700/80 text-neutral-100 shadow-sm">
            <Music2 className="size-4 text-amber-400" />
          </span>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-bold tracking-tight text-foreground">
              Grand
            </span>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = currentPath === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-secondary text-foreground font-semibold border border-border"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/play">
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-foreground text-background hover:opacity-90 font-medium text-xs shadow-sm"
            >
              <Play className="size-3 fill-current" />
              Pianinoni ochish
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
