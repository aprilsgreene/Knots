import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { TraitDef } from "@shared/schema";

interface TraitSliderProps {
  trait: TraitDef;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /** Prefix for data-testid so a slider rendered twice (e.g. page tab + check-in modal) stays uniquely addressable. */
  testIdPrefix?: string;
}

// Renders a single trait as a 1-10 slider anchored in the trait's own
// language (never "good/bad"). Framed as tentative and user-editable --
// never presented as a fixed fact about the other person.
export function TraitSlider({ trait, value, onChange, disabled, testIdPrefix = "" }: TraitSliderProps) {
  const [local, setLocal] = useState(value);

  // Keep the visible slider in sync if the underlying value changes from
  // outside (e.g. loading a different check-in, or resetting the flow).
  useEffect(() => {
    setLocal(value);
  }, [value, trait.key]);

  return (
    <div className="space-y-2" data-testid={`${testIdPrefix}trait-slider-${trait.key}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-foreground">
          {trait.label}
          {trait.description && (
            <span className="text-xs text-muted-foreground ml-1.5">{trait.description}</span>
          )}
        </span>
        <span className="text-sm font-medium text-primary tabular-nums" data-testid={`${testIdPrefix}text-trait-value-${trait.key}`}>
          {local}
          <span className="text-muted-foreground">/10</span>
        </span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[local]}
        disabled={disabled}
        onValueChange={([v]) => setLocal(v)}
        onValueCommit={([v]) => onChange(v)}
        aria-label={trait.label}
        data-testid={`${testIdPrefix}slider-${trait.key}`}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="max-w-[45%]">{trait.lowAnchor}</span>
        <span className="max-w-[45%] text-right">{trait.highAnchor}</span>
      </div>
    </div>
  );
}
