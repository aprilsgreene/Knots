import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { PATTERN_CATEGORIES, describeCategoryLevel } from "@/lib/relationshipTypes";
import type { Relationship, TraitRating } from "@shared/schema";

// The one thing every relationship on this list has in common is you. This
// view looks only at the four observational/pattern categories -- the ones
// that recur across relationships and can also reveal your own patterns --
// never the five healthy categories. It shows which pattern categories show
// up, at an elevated level, across more than one relationship. This is a
// plain count of your own tentative ratings, never a verdict about any
// person and never a score.

const ELEVATED_THRESHOLD = 6;

interface RelPatternHit {
  relationship: Relationship;
  average: number;
}

export function CrossRelationshipPatterns({ relationships }: { relationships: Relationship[] }) {
  const traitQueries = useQueries({
    queries: relationships.map((rel) => ({
      queryKey: ["/api/relationships", rel.id, "traits"],
      queryFn: async () => {
        const res = await apiRequest("GET", `/api/relationships/${rel.id}/traits`);
        return res.json() as Promise<TraitRating[]>;
      },
    })),
  });

  const isLoading = traitQueries.some((q) => q.isLoading);

  const byCategory = useMemo(() => {
    const result: Record<string, RelPatternHit[]> = {};
    PATTERN_CATEGORIES.forEach((cat) => (result[cat.key] = []));

    relationships.forEach((rel, i) => {
      const ratings = traitQueries[i]?.data;
      if (!ratings || ratings.length === 0) return;
      const ratingMap: Record<string, number> = {};
      ratings.forEach((r) => (ratingMap[r.traitKey] = r.value));

      PATTERN_CATEGORIES.forEach((cat) => {
        const vals = cat.traits.map((t) => ratingMap[t.key]).filter((v): v is number => v !== undefined);
        if (vals.length === 0) return;
        const average = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (average >= ELEVATED_THRESHOLD) {
          result[cat.key].push({ relationship: rel, average: Math.round(average * 10) / 10 });
        }
      });
    });

    return result;
  }, [relationships, traitQueries.map((q) => q.data)]);

  const recurring = PATTERN_CATEGORIES
    .map((cat) => ({ cat, hits: byCategory[cat.key] ?? [] }))
    .filter((c) => c.hits.length >= 2)
    .sort((a, b) => b.hits.length - a.hits.length);

  if (relationships.length < 2 || isLoading) return null;

  if (recurring.length === 0) return null;

  return (
    <Card className="p-4" data-testid="card-cross-relationship-patterns">
      <h2 className="text-sm text-foreground mb-1">Patterns that show up across more than one relationship</h2>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        The one thing every relationship here has in common is you. These are the observational categories
        where your own ratings have been elevated in more than one relationship — worth noticing in what others
        do, and in what keeps showing up for you, too. Tentative and always editable, never a verdict.
      </p>
      <div className="space-y-3">
        {recurring.map(({ cat, hits }) => (
          <div key={cat.key} className="rounded-md border border-border px-3.5 py-3" data-testid={`cross-pattern-${cat.key}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-foreground">{cat.label}</span>
              <span className="text-xs text-muted-foreground">
                {hits.length} of {relationships.length} relationships
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {hits.map(({ relationship, average }) => (
                <Link
                  key={relationship.id}
                  href={`/relationships/${relationship.id}`}
                  className="text-xs rounded-full border border-border bg-muted px-2 py-0.5 text-foreground hover-elevate active-elevate-2"
                  data-testid={`cross-pattern-link-${cat.key}-${relationship.id}`}
                >
                  {relationship.label} · {describeCategoryLevel(average)}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
