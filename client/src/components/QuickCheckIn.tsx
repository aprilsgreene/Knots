import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TraitSlider } from "@/components/TraitSlider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TraitCategoryDef } from "@shared/schema";

interface QuickCheckInProps {
  relationshipId: string;
  category: TraitCategoryDef;
  currentRatings: Record<string, number>;
  defaultValue: number;
  open: boolean;
  onClose: () => void;
}

// A lighter-weight alternative to the full 4-step CheckInFlow: rate only the
// traits in one category, save immediately. No note field, no other
// categories, no summary screen. The saved check-in still carries the rest
// of the relationship's latest ratings forward unchanged -- only this
// category's values can move -- so other categories never silently reset.
export function QuickCheckIn({ relationshipId, category, currentRatings, defaultValue, open, onClose }: QuickCheckInProps) {
  const { toast } = useToast();
  const [ratings, setRatings] = useState<Record<string, number>>(currentRatings);

  // Re-seed every time the dialog opens, same reasoning as CheckInFlow: this
  // component stays mounted (just hidden) between opens, so a mount-only
  // useState initializer would go stale after the first open.
  useEffect(() => {
    if (open) {
      setRatings(currentRatings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/relationships/${relationshipId}/checkins`, {
        ratings,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "checkins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", relationshipId, "traits"] });
      toast({ title: "Quick check-in saved" });
      onClose();
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" data-testid="dialog-quick-checkin">
        <DialogHeader>
          <DialogTitle className="font-serif text-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Quick check-in · {category.label}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Rate just this category and save. Your other ratings stay as they were.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {category.traits.map((trait) => (
            <TraitSlider
              key={trait.key}
              trait={trait}
              value={ratings[trait.key] ?? defaultValue}
              onChange={(v) => setRatings((r) => ({ ...r, [trait.key]: v }))}
              testIdPrefix="quick-"
            />
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} data-testid="button-quick-checkin-cancel">
            Cancel
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-quick-checkin-save">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
