import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TraitSlider } from "@/components/TraitSlider";
import { RadarChart } from "@/components/RadarChart";
import {
  HEALTHY_CATEGORIES,
  PATTERN_CATEGORIES,
  summarizeHealthyCategories,
  summarizePatternCategories,
  describeCategoryLevel,
} from "@/lib/relationshipTypes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CheckInFlowProps {
  relationshipId: string;
  relationshipLabel: string;
  currentRatings: Record<string, number>;
  open: boolean;
  onClose: () => void;
}

const STEPS = ["Note", "Healthy dimensions", "Patterns I've noticed", "Summary"] as const;

export function CheckInFlow({ relationshipId, relationshipLabel, currentRatings, open, onClose }: CheckInFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [note, setNote] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>(currentRatings);
  const [activeHealthyTab, setActiveHealthyTab] = useState(HEALTHY_CATEGORIES[0].key);
  const [activePatternTab, setActivePatternTab] = useState(PATTERN_CATEGORIES[0].key);

  // Re-seed from the latest persisted ratings every time the dialog opens.
  // The component itself never unmounts (it's always in the tree, toggled by
  // `open`), so a mount-only useState initializer would otherwise keep
  // reusing whatever snapshot was captured the first time this rendered --
  // including a stale one grabbed mid-invalidation right after a save.
  useEffect(() => {
    if (open) {
      setRatings(currentRatings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const healthySummary = useMemo(() => summarizeHealthyCategories(ratings), [ratings]);
  const patternSummary = useMemo(() => summarizePatternCategories(ratings), [ratings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/relationships/${relationshipId}/checkins`, {
        ratings,
        note: note.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "traits"] });
      toast({ title: "Check-in saved to your timeline" });
      reset();
      onClose();
    },
  });

  function reset() {
    setStep(0);
    setNote("");
    setRatings(currentRatings);
    setActiveHealthyTab(HEALTHY_CATEGORIES[0].key);
    setActivePatternTab(PATTERN_CATEGORIES[0].key);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const activeHealthyCategory = HEALTHY_CATEGORIES.find((c) => c.key === activeHealthyTab)!;
  const activePatternCategory = PATTERN_CATEGORIES.find((c) => c.key === activePatternTab)!;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0" data-testid="dialog-checkin">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-serif text-lg">Check-in · {relationshipLabel}</DialogTitle>
              <DialogDescription className="text-xs uppercase tracking-wide mt-0.5">
                {STEPS[step]}
              </DialogDescription>
            </div>
          </div>
          <div className="flex gap-1.5 pt-2" role="list" aria-label="Check-in steps">
            {STEPS.map((s, i) => (
              <div
                key={s}
                role="listitem"
                className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`}
                aria-current={i === step}
              />
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This check-in captures a moment-in-time reading of your own experience with{" "}
                <span className="text-foreground">{relationshipLabel}</span>. Everything here is tentative and
                editable — your ratings, not facts about them. It's saved to your private timeline so you can notice
                how things move over time.
              </p>
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

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                The same five dimensions for every relationship, so you can notice your own patterns over time.
              </p>
              <Tabs value={activeHealthyTab} onValueChange={setActiveHealthyTab}>
                <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
                  {HEALTHY_CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat.key} value={cat.key} className="text-xs" data-testid={`tab-healthy-${cat.key}`}>
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {HEALTHY_CATEGORIES.map((cat) => (
                  <TabsContent key={cat.key} value={cat.key} className="space-y-5 mt-4">
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                    {cat.traits.map((trait) => (
                      <TraitSlider
                        key={trait.key}
                        trait={trait}
                        value={ratings[trait.key] ?? 5}
                        onChange={(v) => setRatings((r) => ({ ...r, [trait.key]: v }))}
                        testIdPrefix="checkin-"
                      />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-md border border-border bg-muted/50 px-3.5 py-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These track moments you experienced or noticed — not a label on the other person. Rate how often
                  each has come up for you; 1 means rarely or never, 10 means often. Nothing here computes a score or
                  tells you what to do — it's just a record you can look back on.
                </p>
              </div>
              <Tabs value={activePatternTab} onValueChange={setActivePatternTab}>
                <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
                  {PATTERN_CATEGORIES.map((cat) => (
                    <TabsTrigger key={cat.key} value={cat.key} className="text-xs" data-testid={`tab-pattern-${cat.key}`}>
                      {cat.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {PATTERN_CATEGORIES.map((cat) => (
                  <TabsContent key={cat.key} value={cat.key} className="space-y-5 mt-4">
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                    {cat.traits.map((trait) => (
                      <TraitSlider
                        key={trait.key}
                        trait={trait}
                        value={ratings[trait.key] ?? 1}
                        onChange={(v) => setRatings((r) => ({ ...r, [trait.key]: v }))}
                        testIdPrefix="checkin-"
                      />
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <RadarChart
                categories={healthySummary.map((c) => ({ label: c.categoryLabel, average: c.average }))}
                size={260}
                caption="Your own ratings across the five healthy dimensions, this check-in."
              />
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
                            <span
                              key={t.key}
                              className="text-xs rounded-full border border-border bg-muted px-2 py-0.5 text-muted-foreground"
                            >
                              {t.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  This is a plain summary of the numbers you just entered, not a diagnosis or a recommendation. If a
                  pattern here concerns you, consider talking it through with someone you trust or a professional —
                  see Support & Safety in Settings for resources.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : handleClose())}
            data-testid="button-checkin-back"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} data-testid="button-checkin-next">
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-checkin-save">
              Save check-in
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
