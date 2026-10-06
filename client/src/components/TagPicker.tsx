import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagPickerProps {
  label: string;
  suggestions: string[];
  selected: string[];
  onChange: (tags: string[]) => void;
  testIdPrefix: string;
}

// A gentle, user-controlled tag picker. Tags describe observable moments
// ("boundary pressure") not permanent traits about a person. Users can
// select suggestions or add their own free-text tag.
export function TagPicker({ label, suggestions, selected, onChange, testIdPrefix }: TagPickerProps) {
  const [customValue, setCustomValue] = useState("");

  const toggle = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const addCustom = () => {
    const trimmed = customValue.trim().toLowerCase();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomValue("");
  };

  // Merge suggestions with any already-selected custom tags so they render as chips too
  const allOptions = Array.from(new Set([...suggestions, ...selected]));

  return (
    <div className="space-y-2">
      <label className="text-sm text-foreground">{label}</label>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {allOptions.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={active}
              data-testid={`${testIdPrefix}-${tag.replace(/\s+/g, "-")}`}
              className={cn(
                "text-sm px-3 py-1.5 rounded-full border transition-colors hover-elevate active-elevate-2",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-secondary-foreground border-border"
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <Input
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Add your own word..."
          className="flex-1"
          data-testid={`${testIdPrefix}-custom-input`}
        />
        <Button type="button" variant="secondary" size="icon" onClick={addCustom} aria-label="Add tag" data-testid={`${testIdPrefix}-custom-add`}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
