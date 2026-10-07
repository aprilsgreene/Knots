import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

// Shown when the address inside the app doesn't match any screen. It never
// dead-ends: one tap goes home.
export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col items-center text-center gap-3 py-16 px-4" data-testid="page-not-found">
      <Compass className="w-8 h-8 text-primary" strokeWidth={1.5} aria-hidden="true" />
      <h1 className="font-serif text-xl text-foreground">We can't find that page</h1>
      <p className="text-sm text-muted-foreground max-w-xs">
        The link may be old or mistyped. Your entries are safe.
      </p>
      <Button onClick={() => navigate("/", { replace: true })} data-testid="button-go-home">
        Go to home
      </Button>
    </div>
  );
}
