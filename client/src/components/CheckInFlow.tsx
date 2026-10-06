import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TraitSlider } from "@/components/TraitSlider";
import { RadarChart } from "@/components/RadarChart";
import { InfoModal } from "@/components/InfoModal";
import {
  HEALTHY_CATEGORIES,
  PATTERN_CATEGORIES,
  summarizeHealthyCategories,
  summarizePatternCategories,
  describeCategoryLevel,
} from "@/lib/relationshipTypes";
import {
  HEALTHY_DEFAULT,
  PATTERN_DEFAULT,
  clearField,
  initFields,
  touchField,
  touchedCount,
  touchedRatings,
  type FieldMap,
} from "@/lib/checkInState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TraitCategoryDef } from "@shared/schema";

interface CheckInFlowProps {
  relationshipId: string;
  relationshipLabel: string;
  /** Last saved ratings. Used only to position the sliders; they are never re-saved unless touched. */
  currentRatings: Record<string, number>;
  open: boolean;
  onClose: () => void;
}

type WizardCategory = { def: TraitCategoryDef; defaultValue: number; section: "healthy" | "pattern" };

// One linear sequence: every category, in order, one per screen.
const CATEGORIES: WizardCategory[] = [
  ...HEALTHY_CATEGORIES.map((def) => ({ def, defaultValue: HEALTHY_DEFAULT, section: "healthy" as const })),
  ...PATTERN_CATEGORIES.map((def) => ({ def, defaultValue: PATTERN_DEFAULT, section: "pattern" as const })),
];
const TOTAL = CATEGORIES.length;
// Screens: 0 = note, 1..TOTAL = categories, TOTAL + 1 = review.
const REVIEW_STEP = TOTAL + 1;

export function CheckInFlow({ relationshipId, relationshipLabel, currentRatings, open, onClose }: CheckInFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [note, setNote] = useState("");
  const [fields, setFields] = useState<FieldMap>(() => initFields(CATEGORIES, currentRatings));

  // Start fresh every time the dialog opens. Fields are re-seeded from the
  // latest saved ratings for display only, and all of them start untouched.
  useEffect(() => {
    if (open) {
      setStep(0);
      setNote("");
      setFields(initFields(CATEGORIES, currentRatings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Only what the person actually touched.
  const ratings = useMemo(() => touchedRatings(fields), [fields]);
  const ratedCount = Object.keys(ratings).length;
  const healthySummary = useMemo(() => summarizeHealthyCategories(ratings), [ratings]);
  const patternSummary = useMemo(
    () => summarizePatternCategories(ratings).filter((c) => c.hasData),
    [ratings]
  );
  const skippedCategories = CATEGORIES.filter(({ def }) => touchedCount(fields, def.traits) === 0).length;

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Untouched defaults never leave this component.
      const res = await apiRequest("POST", `/api/relationships/${relationshipId}/checkins`, {
        ratings: touchedRatings(fields),
        note: note.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "traits"] });
      toast({ title: "Check-in saved to your timeline" });
      onClose();
    },
    onError: () => {
      toast({ title: "Couldn't save the check-in", description: "Please try again.", variant: "destructive" });
    },
  });

  const onCategoryStep = step >= 1 && step <= TOTAL;
  const current = onCategoryStep ? CATEGORIES[step - 1] : null;
  const canSave = (ratedCount > 0 || note.trim().length > 0) && !saveMutation.isPending;

  const stepLabel =
    step === 0 ? "Getting started" : step === REVIEW_STEP ? "Review" : `Category ${step} of ${TOTAL}`;
  const progressPct = Math.round((step / REVIEW_STEP) * 100);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saveMutation.isPending && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0" data-testid="dialog-checkin">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <DialogTitle className="font-serif text-lg">Full check-in · {relationshipLabel}</DialogTitle>
          <DialogDescription className="text-xs uppercase tracking-wide mt-0.5" data-testid="text-checkin-progress">
            {stepLabel}
            {current && <span className="normal-case tracking-normal"> · {current.def.label}</span>}
          </DialogDescription>
          <div
            className="h-1.5 w-full rounded-full bg-muted mt-2 overflow-hidden"
            role="progressbar"
            aria-label="Check-in progress"
            aria-valuemin={0}
            aria-valuemax={REVIEW_STEP}
            aria-valuenow={step}
            aria-valuetext={stepLabel}
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                A full check-in is a guided, one-category-at-a-time look at how things feel with{" "}
                <span className="text-foreground">{relationshipLabel}</span>. Everything here is tentative and
                editable: your ratings, not facts about them. It's saved to your private timeline.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Only the sliders you actually move are saved. Anything you skip stays out of your charts.
              </p>
              <InfoModal className="-ml-2" />
              <div className="space-y-1.5">
                <label htmlFor="checkin-note" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Note (optional)
                </label>
                <Textarea
                  id="checkin-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="What's prompting this check-in? Any context worth remembering..."
                  rows={4}
                  data-testid="textarea-checkin-note"
                />
              </div>
            </div>
          )}

          {current && (
            <div className="space-y-5" data-testid={`step-category-${current.def.key}`}>
              {current.section === "pattern" ? (
                <div className="rounded-md border border-border bg-muted/50 px-3.5 py-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Patterns I've noticed (optional). These track moments you experienced or noticed, not a
                    label on the other person. 1 means rarely or never, 10 means often. Nothing here computes a
                    score or tells you what to do.
                  </p>
                </div>
              ) : step === 1 ? (
                <p className="text-xs text-muted-foreground">
                  The same five healthy dimensions for every relationship, so you can notice your own patterns
                  over time.
                </p>
              ) : null}
              <p className="text-sm text-foreground font-medium">{current.def.label}</p>
              <p className="text-xs text-muted-foreground -mt-3">{current.def.description}</p>
              {current.def.traits.map((trait) => (
                <TraitSlider
                  key={trait.key}
                  trait={trait}
                  value={fields[trait.key].value}
                  touched={fields[trait.key].isTouched}
                  onTouch={() => setFields((f) => touchField(f, trait.key))}
                  onChange={(v) => setFields((f) => touchField(f, trait.key, v))}
                  onClear={() =>
                    setFields((f) => clearField(f, trait.key, currentRatings[trait.key] ?? current.defaultValue))
                  }
                  testIdPrefix="checkin-"
                />
              ))}
            </div>
          )}

          {step === REVIEW_STEP && (
            <div className="space-y-5" data-testid="step-review">
              <div className="rounded-md border border-border px-3.5 py-3" data-testid="text-review-counts">
                <p className="text-sm text-foreground">
                  {ratedCount === 0
                    ? "You haven't rated anything yet."
                    : `${ratedCount} item${ratedCount === 1 ? "" : "s"} will be saved.`}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {ratedCount === 0
                    ? "Go back and move at least one slider, or add a note, to save a check-in."
                    : `${skippedCategories} categor${skippedCategories === 1 ? "y was" : "ies were"} skipped and won't affect your charts.`}
                </p>
              </div>

              {healthySummary.some((c) => c.hasData) && (
                <RadarChart
                  categories={healthySummary.map((c) => ({ label: c.categoryLabel, average: c.average, hasData: c.hasData }))}
                  size={260}
                  caption="Your own ratings across the five healthy dimensions. Categories you skipped are left blank."
                />
              )}

              {patternSummary.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                    Patterns you noticed this check-in
                  </p>
                  <div className="space-y-3">
                    {patternSummary.map((cat) => (
                      <div key={cat.categoryKey} className="rounded-md border border-border px-3.5 py-3" data-testid={`summary-${cat.categoryKey}`}>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm text-foreground">{cat.categoryLabel}</span>
                          <span className="text-xs text-muted-foreground">{describeCategoryLevel(cat.average)}</span>
                        </div>
                        {cat.elevatedTraits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {cat.elevatedTraits.map((t) => (
                              <span key={t.key} className="text-xs rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                                {t.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground leading-relaxed">
                This is a plain summary of the numbers you just entered, not a diagnosis or a recommendation. If a
                pattern here concerns you, consider talking it through with someone you trust or a professional.
                See Support &amp; Safety in Settings for resources.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3.5 border-t border-border">
          {step === 0 ? (
            <Button variant="ghost" onClick={onClose} data-testid="button-checkin-cancel">
              Cancel
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={saveMutation.isPending}
              data-testid="button-checkin-prev"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === REVIEW_STEP ? "Back" : step === 1 ? "Back" : "Previous Category"}
            </Button>
          )}

          {step === 0 && (
            <Button onClick={() => setStep(1)} data-testid="button-checkin-start">
              Begin
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {onCategoryStep && step < TOTAL && (
            <Button onClick={() => setStep((s) => s + 1)} data-testid="button-checkin-next">
              Next Category
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {step === TOTAL && (
            <Button onClick={() => setStep(REVIEW_STEP)} data-testid="button-checkin-review">
              Review &amp; Save Check-In
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {step === REVIEW_STEP && (
            <Button onClick={() => saveMutation.mutate()} disabled={!canSave} data-testid="button-checkin-save">
              {saveMutation.isPending ? "Saving..." : "Save check-in"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
