import { useState, type ReactNode } from "react";
import { Info, Zap, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface InfoModalProps {
  /** Visible text on the trigger. Defaults to a short, friendly question. */
  triggerLabel?: string;
  title?: string;
  description?: string;
  /** Custom body. When omitted, the Quick vs Full check-in explainer is shown. */
  children?: ReactNode;
  className?: string;
  testId?: string;
}

/** The two check-in types, in the words used across the app. */
export function CheckInTypesExplainer() {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-md border border-border px-3.5 py-3" data-testid="info-quick-checkin">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-foreground font-medium">Quick Check-In</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            A fast, low-friction mood and status update for tracking daily feelings on the go. Pick one
            category, move a slider or two, and save.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 rounded-md border border-border px-3.5 py-3" data-testid="info-full-checkin">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-accent-foreground" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm text-foreground font-medium">Full Check-In</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            A comprehensive, guided journaling process for deep reflection and pattern tracking. It walks you
            through each category one step at a time.
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        In both, only the sliders you actually move are saved. Anything you leave alone is skipped, so it
        never counts toward your charts.
      </p>
    </div>
  );
}

/**
 * Small "i" button that opens an explainer pop-up. Used next to the check-in
 * buttons to explain Quick vs Full check-ins.
 */
export function InfoModal({
  triggerLabel = "Quick or Full check-in?",
  title = "Two ways to check in",
  description = "Use whichever fits the moment.",
  children,
  className = "",
  testId = "button-info-checkin-types",
}: InfoModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className={`text-xs text-muted-foreground ${className}`}
        data-testid={testId}
      >
        <Info className="w-3.5 h-3.5" aria-hidden="true" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-info">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg">{title}</DialogTitle>
            <DialogDescription className="text-sm">{description}</DialogDescription>
          </DialogHeader>
          {children ?? <CheckInTypesExplainer />}
          <div className="flex justify-end pt-1">
            <Button onClick={() => setOpen(false)} data-testid="button-info-close">Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
