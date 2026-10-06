import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import type { Entry, Relationship } from "@shared/schema";

export default function ThemesPage() {
  const { data: entries, isLoading: loadingEntries } = useQuery<Entry[]>({ queryKey: ["/api/entries"] });
  const { data: relationships, isLoading: loadingRels } = useQuery<Relationship[]>({ queryKey: ["/api/relationships"] });

  const relMap = useMemo(() => {
    const map: Record<string, Relationship> = {};
    (relationships ?? []).forEach((r) => (map[r.id] = r));
    return map;
  }, [relationships]);

  // Group tag occurrences by tag -> relationship -> count. Presented purely
  // as "entries tagged X appeared N times" -- never as a verdict, score, or
  // claim about the other person.
  const tagBreakdown = useMemo(() => {
    const byTag: Record<string, Record<string, number>> = {};
    (entries ?? []).forEach((e) => {
      const tags = [...JSON.parse(e.emotionTags || "[]"), ...JSON.parse(e.situationTags || "[]")];
      tags.forEach((t: string) => {
        byTag[t] = byTag[t] || {};
        byTag[t][e.relationshipId] = (byTag[t][e.relationshipId] || 0) + 1;
      });
    });
    return Object.entries(byTag)
      .map(([tag, byRel]) => ({
        tag,
        total: Object.values(byRel).reduce((a, b) => a + b, 0),
        byRel,
      }))
      .filter((t) => t.total >= 2)
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [entries]);

  const isLoading = loadingEntries || loadingRels;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-xl text-foreground">Themes you're watching</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          These are observations about your own entries — what shows up, and how often. They're not
          conclusions about anyone, and they're never a score.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!isLoading && tagBreakdown.length === 0 && (
        <div className="empty-state text-center py-16 px-6" data-testid="empty-state-themes">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4 mx-auto">
            <Sparkles className="w-6 h-6 text-accent-foreground" strokeWidth={1.75} />
          </div>
          <h2 className="font-serif text-lg text-foreground mb-2">Nothing recurring yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Once you've added a few entries with tags, anything that repeats will show up here.
          </p>
        </div>
      )}

      {!isLoading && tagBreakdown.length > 0 && (
        <ul role="list" className="space-y-3" data-testid="list-themes">
          {tagBreakdown.map(({ tag, total, byRel }) => (
            <li key={tag}>
              <Card className="p-4" data-testid={`card-theme-${tag.replace(/\s+/g, "-")}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="secondary">{tag}</Badge>
                  <span className="text-xs text-muted-foreground">
                    Entries tagged "{tag}" appeared {total} time{total === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {Object.entries(byRel).map(([relId, count]) => {
                    const rel = relMap[relId];
                    if (!rel) return null;
                    return (
                      <Link
                        key={relId}
                        href={`/relationships/${relId}`}
                        className="text-xs text-primary underline underline-offset-2"
                        data-testid={`link-theme-relationship-${relId}`}
                      >
                        {rel.label} ({count})
                      </Link>
                    );
                  })}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
