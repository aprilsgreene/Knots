import { Link, useLocation } from "wouter";
import { Home, Sparkles, Settings, LifeBuoy } from "lucide-react";
import { LogoLockup } from "./Logo";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Relationships", icon: Home },
  { href: "/themes", label: "Themes", icon: Sparkles },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 py-3">
          <Link href="/" data-testid="link-home-logo">
            <LogoLockup size={26} />
          </Link>
          <Link
            href="/support"
            className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate active-elevate-2 rounded-full px-3 py-1.5"
            data-testid="link-support-header"
          >
            <LifeBuoy className="w-4 h-4" />
            Support &amp; Safety
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1 mx-auto w-full max-w-2xl px-4 pb-24 pt-4 sm:pb-10">
        {children}
      </main>

      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card sm:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-2xl grid grid-cols-4 px-2 py-1.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 py-1.5 text-xs no-default-hover-elevate no-default-active-elevate"
                data-testid={`link-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span
                  className={cn(
                    "flex items-center justify-center h-8 w-12 rounded-full transition-colors",
                    active ? "bg-accent" : "bg-transparent"
                  )}
                >
                  <Icon
                    className={cn("w-5 h-5", active ? "text-accent-foreground" : "text-muted-foreground")}
                    strokeWidth={active ? 2.25 : 1.75}
                  />
                </span>
                <span className={active ? "text-primary font-medium" : "text-muted-foreground"}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden sm:block border-t border-border">
        <div className="mx-auto max-w-2xl px-4 py-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/support" className="hover-elevate active-elevate-2 rounded px-1 -mx-1" data-testid="link-support-footer">
            Support &amp; Safety
          </Link>
          <Link href="/legal/privacy" className="hover-elevate active-elevate-2 rounded px-1 -mx-1" data-testid="link-privacy-footer">
            Privacy Policy
          </Link>
          <Link href="/legal/terms" className="hover-elevate active-elevate-2 rounded px-1 -mx-1" data-testid="link-terms-footer">
            Terms of Use
          </Link>
          <Link href="/legal" className="hover-elevate active-elevate-2 rounded px-1 -mx-1" data-testid="link-legal-footer">
            All policies
          </Link>
        </div>
      </footer>
    </div>
  );
}
