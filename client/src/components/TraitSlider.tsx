import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import type { TraitDef } from "@shared/schema";

interface TraitSliderProps {
  trait: TraitDef;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  /**
   * When provided, the slider runs in "dirty tracking" mode: it looks
   * un-rated until the person interacts with it, and onTouch fires on the
   * first pointer or keyboard interaction (even if the value ends up the
   * same as the starting one).
   */
  touched?: boolean;
  onTouch?: () => void;
  /** Lets the person undo a rating and leave this field out of the check-in. */
  onClear?: () => void;
  /** Prefix for data-testid so a slider rendered twice stays uniquely addressable. */
  testIdPrefix?: string;
}

// Renders a single trait as a 1-10 slider anchored in the trait's own
// language (never "good/bad"). Framed as tentative and user-editable --
// never presented as a fixed fact about the other person.
export function TraitSlider({
  trait,
  value,
  onChange,
  disabled,
  touched,
  onTouch,
  onClear,
  testIdPrefix = "",
}: TraitSliderProps) {
  const [local, setLocal] = useState(value);
  const tracking = touched !== undefined;
  const unrated = tracking && !touched;

  // Keep the visible slider in sync if the underlying value changes from
  // outside (e.g. loading a different check-in, or resetting the flow).
  useEffect(() => {
    setLocal(value);
  }, [value, trait.key]);

  return (
    <div
      className="space-y-2"
      data-testid={`${testIdPrefix}trait-slider-${trait.key}`}
      data-touched={tracking ? String(Boolean(touched)) : undefined}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-foreground">
          {trait.label}
          {trait.description && (
            <span className="text-xs text-muted-foreground ml-1.5">{trait.description}</span>
          )}
        </span>
        <span
          className={`text-sm font-medium tabular-nums shrink-0 ${unrated ? "text-muted-foreground" : "text-primary"}`}
          data-testid={`${testIdPrefix}text-trait-value-${trait.key}`}
        >
          {unrated ? (
            <span className="text-xs font-normal">Not rated</span>
          ) : (
            <>
              {local}
              <span className="text-muted-foreground">/10</span>
            </>
          )}
        </span>
      </div>
      <div
        className={unrated ? "opacity-60" : undefined}
        onPointerDown={() => onTouch?.()}
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(e.key)) {
            onTouch?.();
          }
        }}
      >
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
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="max-w-[45%]">{trait.lowAnchor}</span>
        <span className="max-w-[45%] text-right">{trait.highAnchor}</span>
      </div>
      {tracking && (
        <div className="flex items-center justify-between text-xs text-muted-foreground min-h-5">
          <span>{unrated ? "Skipped unless you move it. Tap or drag to rate." : "Included in this check-in"}</span>
          {touched && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="underline underline-offset-2 hover:text-foreground"
              data-testid={`${testIdPrefix}button-clear-${trait.key}`}
            >
              Skip this one
            </button>
          )}
        </div>
      )}
    </div>
  );
}
