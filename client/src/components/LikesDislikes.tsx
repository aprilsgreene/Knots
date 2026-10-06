import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Pencil, Plus, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PREFERENCE_CATEGORIES } from "@/lib/relationshipTypes";
import type { Preference, PreferenceKind } from "@shared/schema";

type Props = {
  relationshipId: string;
  relationshipLabel: string;
};

const categoryLabel = (key: string) =>
  PREFERENCE_CATEGORIES.find((c) => c.key === key)?.label ?? "Something else";

export function LikesDislikes({ relationshipId, relationshipLabel }: Props) {
  const { toast } = useToast();
  const queryKey = ["/api/relationships", relationshipId, "preferences"];

  const [kind, setKind] = useState<PreferenceKind>("like");
  const [category, setCategory] = useState("food_drink");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editNote, setEditNote] = useState("");

  const { data: items, isLoading } = useQuery<Preference[]>({ queryKey });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/relationships/${relationshipId}/preferences`, {
        kind,
        category,
        text: text.trim(),
        note: note.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setText("");
      setNote("");
      setShowNote(false);
    },
    onError: () => toast({ title: "Couldn't save that", description: "Please try again.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/preferences/${id}`, {
        text: editText.trim(),
        note: editNote.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEditingId(null);
    },
    onError: () => toast({ title: "Couldn't save that change", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/preferences/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const grouped = useMemo(() => {
    const build = (k: PreferenceKind) => {
      const list = (items ?? []).filter((i) => i.kind === k);
      return PREFERENCE_CATEGORIES.map((c) => ({
        key: c.key,
        label: c.label,
        items: list.filter((i) => i.category === c.key),
      })).filter((g) => g.items.length > 0);
    };
    return { like: build("like"), dislike: build("dislike") };
  }, [items]);

  const counts = {
    like: (items ?? []).filter((i) => i.kind === "like").length,
    dislike: (items ?? []).filter((i) => i.kind === "dislike").length,
  };

  const activeCat = PREFERENCE_CATEGORIES.find((c) => c.key === category)!;
  const canAdd = text.trim().length > 0 && !addMutation.isPending;

  const startEdit = (p: Preference) => {
    setEditingId(p.id);
    setEditText(p.text);
    setEditNote(p.note ?? "");
  };

  const renderSection = (k: PreferenceKind) => {
    const groups = grouped[k];
    const isLike = k === "like";
    return (
      <Card className="p-4" data-testid={`card-${k}s`}>
        <div className="flex items-center gap-2 mb-1">
          {isLike ? (
            <ThumbsUp className="w-4 h-4 text-primary" aria-hidden="true" />
          ) : (
            <ThumbsDown className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          )}
          <h2 className="text-sm text-foreground">
            {isLike ? "Likes" : "Dislikes"} <span className="text-muted-foreground">· {counts[k]}</span>
          </h2>
        </div>

        {groups.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2" data-testid={`empty-${k}s`}>
            {isLike
              ? `Nothing here yet. Add what ${relationshipLabel} lights up about.`
              : `Nothing here yet. Add what ${relationshipLabel} would rather skip.`}
          </p>
        ) : (
          <div className="space-y-4 mt-3">
            {groups.map((g) => (
              <div key={g.key}>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">{g.label}</p>
                <ul className="space-y-1.5">
                  {g.items.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-md bg-muted/50 px-3 py-2"
                      data-testid={`pref-${p.id}`}
                    >
                      {editingId === p.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            maxLength={200}
                            aria-label="Edit text"
                            data-testid={`input-edit-pref-${p.id}`}
                          />
                          <Input
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            maxLength={500}
                            placeholder="How you learned this (optional)"
                            aria-label="Edit note"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                              data-testid={`button-cancel-edit-${p.id}`}
                            >
                              <X className="w-4 h-4" /> Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!editText.trim() || updateMutation.isPending}
                              onClick={() => updateMutation.mutate(p.id)}
                              data-testid={`button-save-edit-${p.id}`}
                            >
                              <Check className="w-4 h-4" /> Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground break-words">{p.text}</p>
                            {p.note && <p className="text-xs text-muted-foreground mt-0.5 break-words">{p.note}</p>}
                          </div>
                          <div className="flex shrink-0 -mr-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => startEdit(p)}
                              aria-label={`Edit ${p.text}`}
                              data-testid={`button-edit-pref-${p.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => deleteMutation.mutate(p.id)}
                              aria-label={`Remove ${p.text}`}
                              data-testid={`button-delete-pref-${p.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4" data-testid="likes-dislikes">
      <p className="text-sm text-muted-foreground">
        Little things you're learning about {relationshipLabel} — what they've told you or what you've noticed, in your own
        words. Only you can see this.
      </p>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Like or dislike">
          <Button
            type="button"
            variant={kind === "like" ? "default" : "outline"}
            onClick={() => setKind("like")}
            aria-pressed={kind === "like"}
            data-testid="toggle-kind-like"
          >
            <ThumbsUp className="w-4 h-4" /> Like
          </Button>
          <Button
            type="button"
            variant={kind === "dislike" ? "default" : "outline"}
            onClick={() => setKind("dislike")}
            aria-pressed={kind === "dislike"}
            data-testid="toggle-kind-dislike"
          >
            <ThumbsDown className="w-4 h-4" /> Dislike
          </Button>
        </div>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger aria-label="Category" data-testid="select-pref-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PREFERENCE_CATEGORIES.map((c) => (
              <SelectItem key={c.key} value={c.key}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (canAdd) addMutation.mutate();
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder={kind === "like" ? activeCat.placeholderLike : activeCat.placeholderDislike}
            aria-label={kind === "like" ? "Something they like" : "Something they dislike"}
            data-testid="input-pref-text"
          />

          {showNote ? (
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="How you learned this, e.g. they told me on our second date"
              aria-label="How you learned this"
              data-testid="input-pref-note"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowNote(true)}
              className="text-xs text-muted-foreground underline underline-offset-2"
              data-testid="button-show-pref-note"
            >
              Add how you learned this
            </button>
          )}

          <Button type="submit" className="w-full" disabled={!canAdd} data-testid="button-add-pref">
            <Plus className="w-4 h-4" />
            Add to {kind === "like" ? "likes" : "dislikes"}
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : (
        <>
          {renderSection("like")}
          {renderSection("dislike")}
        </>
      )}
    </div>
  );
}
