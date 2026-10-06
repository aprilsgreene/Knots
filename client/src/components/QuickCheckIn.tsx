import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TraitSlider } from "@/components/TraitSlider";
import { InfoModal } from "@/components/InfoModal";
import { HEALTHY_CATEGORIES } from "@/lib/relationshipTypes";
import {
  HEALTHY_DEFAULT,
  clearField,
  initFields,
  touchField,
  touchedRatings,
  type FieldMap,
} from "@/lib/checkInState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface QuickCheckInProps {
  relationshipId: string;
  /** Last saved ratings. Used only to position the sliders; they are not re-saved unless touched. */
  currentRatings: Record<string, number>;
}

const CATEGORY_DEFS = HEALTHY_CATEGORIES.map((def) => ({ def, defaultValue: HEALTHY_DEFAULT }));

// A fast, low-friction update: pick one category, move whatever fits right
// now, save. Only the sliders you actually touch are saved, so the rest of
// your ratings and charts stay exactly as they were.
export function QuickCheckIn({ relationshipId, currentRatings }: QuickCheckInProps) {
  const { toast } = useToast();
  const [categoryKey, setCategoryKey] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldMap>(() => initFields(CATEGORY_DEFS, currentRatings));

  // Keep slider starting positions in step with the latest saved ratings
  // (for example after a save), but never mark anything as touched.
  const ratingsKey = JSON.stringify(currentRatings);
  useEffect(() => {
    setFields(initFields(CATEGORY_DEFS, currentRatings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratingsKey]);

  const category = HEALTHY_CATEGORIES.find((c) => c.key === categoryKey) ?? null;
  const ratings = useMemo(() => touchedRatings(fields), [fields]);
  const touchedHere = category ? category.traits.filter((t) => fields[t.key]?.isTouched).length : 0;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/relationships/${relationshipId}/checkins`, { ratings });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "traits"] });
      toast({ title: "Quick check-in saved" });
      setCategoryKey(null);
      setFields(initFields(CATEGORY_DEFS, currentRatings));
    },
    onError: () => {
      toast({ title: "Couldn't save the check-in", description: "Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4" data-testid="panel-quick-checkin">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg text-foreground flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" aria-hidden="true" />
            Quick check-in
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            A fast mood and status update. Pick a category, move what fits right now, and save.
          </p>
        </div>
        <InfoModal triggerLabel="What's this?" testId="button-info-quick" className="shrink-0" />
      </div>

      {!category && (
        <div className="grid gap-2" role="list" aria-label="Categories" data-testid="list-quick-categories">
          {HEALTHY_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              role="listitem"
              onClick={() => setCategoryKey(cat.key)}
              className="text-left rounded-md border border-border px-4 py-3 hover-elevate active-elevate-2"
              data-testid={`button-quick-category-${cat.key}`}
            >
              <span className="block text-sm text-foreground">{cat.label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">{cat.description}</span>
            </button>
          ))}
        </div>
      )}

      {category && (
        <Card className="p-4 space-y-5" data-testid={`quick-${category.key}`}>
          <div>
            <p className="text-sm text-foreground font-medium">{category.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
          </div>
          {category.traits.map((trait) => (
            <TraitSlider
              key={trait.key}
              trait={trait}
              value={fields[trait.key].value}
              touched={fields[trait.key].isTouched}
              onTouch={() => setFields((f) => touchField(f, trait.key))}
              onChange={(v) => setFields((f) => touchField(f, trait.key, v))}
              onClear={() => setFields((f) => clearField(f, trait.key, currentRatings[trait.key] ?? HEALTHY_DEFAULT))}
              testIdPrefix="quick-"
            />
          ))}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button variant="ghost" onClick={() => { setCategoryKey(null); setFields(initFields(CATEGORY_DEFS, currentRatings)); }} disabled={saveMutation.isPending} data-testid="button-quick-back">
              <ChevronLeft className="w-4 h-4" />
              Categories
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || Object.keys(ratings).length === 0}
              data-testid="button-quick-checkin-save"
            >
              {saveMutation.isPending ? "Saving..." : "Save quick check-in"}
            </Button>
          </div>
          {touchedHere === 0 && (
            <p className="text-xs text-muted-foreground -mt-2" data-testid="text-quick-hint">
              Move at least one slider to save. Anything you leave alone is skipped.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
