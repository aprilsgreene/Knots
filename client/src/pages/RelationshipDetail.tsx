import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import {
  ArrowLeft,
  Plus,
  MoreVertical,
  Link2,
  Trash2,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadarChart } from "@/components/RadarChart";
import { CategoryTrendChart } from "@/components/CategoryTrendChart";
import { CheckInFlow } from "@/components/CheckInFlow";
import { QuickCheckIn } from "@/components/QuickCheckIn";
import { InfoModal } from "@/components/InfoModal";
import { LikesDislikes } from "@/components/LikesDislikes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { topWords } from "@/lib/wordFrequency";
import { useToast } from "@/hooks/use-toast";
import {
  RELATIONSHIP_TYPE_LABELS,
  HEALTHY_CATEGORIES,
  PATTERN_CATEGORIES,
  averageOfRated,
  summarizeHealthyCategories,
  summarizePatternCategories,
  describeCategoryLevel,
} from "@/lib/relationshipTypes";
import type { CheckIn, Entry, Relationship, RelationshipType, TraitRating } from "@shared/schema";

export default function RelationshipDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);

  const { data: relationship, isLoading: loadingRel } = useQuery<Relationship>({
    queryKey: ["/api/relationships", id],
  });

  const { data: entries, isLoading: loadingEntries } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { relationshipId: id }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/entries?relationshipId=${id}`);
      return res.json();
    },
  });

  const { data: traitRatings } = useQuery<TraitRating[]>({
    queryKey: ["/api/relationships", id, "traits"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/relationships/${id}/traits`);
      return res.json();
    },
  });

  const { data: checkIns } = useQuery<CheckIn[]>({
    queryKey: ["/api/relationships", id, "checkins"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/relationships/${id}/checkins`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/relationships/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships"] });
      toast({ title: "Relationship and its entries deleted" });
      navigate("/");
    },
  });

  const ratingMap = useMemo(() => {
    const map: Record<string, number> = {};
    (traitRatings ?? []).forEach((r) => (map[r.traitKey] = r.value));
    return map;
  }, [traitRatings]);

  const entryMap = useMemo(() => {
    const map: Record<string, Entry> = {};
    (entries ?? []).forEach((e) => (map[e.id] = e));
    return map;
  }, [entries]);

  // Simple recurring-theme surfacing: count tag occurrences across entries,
  // presented as observations ("appeared N times"), never as verdicts.
  const themeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    (entries ?? []).forEach((e) => {
      const tags = [...JSON.parse(e.situationTags || "[]"), ...JSON.parse(e.emotionTags || "[]")];
      tags.forEach((t: string) => (counts[t] = (counts[t] || 0) + 1));
    });
    return Object.entries(counts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [entries]);

  // Words that come up often across every free-text field in this
  // relationship's own entries -- a plain word-frequency count, never a
  // theme, trait, or claim about the other person.
  const commonWords = useMemo(() => topWords(entries ?? [], 10, 2), [entries]);

  // Overall trait averages across every check-in ever recorded (not just the
  // latest one), so the Overview radar/patterns reflect the whole history.
  // Falls back to the live trait map when there are no check-ins yet.
  const overallRatingMap = useMemo(() => {
    if (!checkIns || checkIns.length === 0) return ratingMap;
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    checkIns.forEach((ci) => {
      const ratings: Record<string, number> = JSON.parse(ci.ratings);
      Object.entries(ratings).forEach(([key, value]) => {
        sums[key] = (sums[key] ?? 0) + value;
        counts[key] = (counts[key] ?? 0) + 1;
      });
    });
    const map: Record<string, number> = {};
    Object.keys(sums).forEach((key) => {
      map[key] = sums[key] / counts[key];
    });
    return map;
  }, [checkIns, ratingMap]);

  const healthySummary = useMemo(() => summarizeHealthyCategories(overallRatingMap), [overallRatingMap]);
  const patternSummary = useMemo(
    () => summarizePatternCategories(overallRatingMap).filter((c) => c.hasData),
    [overallRatingMap]
  );

  // Per-category trend series across check-ins, oldest first, for the
  // Timeline tab's small charts. Each point averages ONLY the traits that
  // were actually rated in that check-in; check-ins that skipped a category
  // simply leave it out, so nothing is ever filled in with a default.
  const buildTrends = (categories: typeof HEALTHY_CATEGORIES) => {
    const ordered = [...(checkIns ?? [])].sort((a, b) => a.createdAt - b.createdAt);
    return categories.map((cat) => ({
      label: cat.label,
      points: ordered.flatMap((ci) => {
        const ratings: Record<string, number> = JSON.parse(ci.ratings);
        const { average, hasData } = averageOfRated(ratings, cat.traits);
        return hasData ? [{ date: ci.createdAt, average }] : [];
      }),
    }));
  };
  const healthyTrends = useMemo(() => buildTrends(HEALTHY_CATEGORIES), [checkIns]);
  const patternTrends = useMemo(() => buildTrends(PATTERN_CATEGORIES), [checkIns]);
  const hasAnyTrend = [...healthyTrends, ...patternTrends].some((t) => t.points.length >= 2);

  // One chronological feed of check-ins and notes, newest first.
  const timelineItems = useMemo(() => {
    const items: ({ kind: "checkin"; date: number; checkIn: CheckIn } | { kind: "note"; date: number; entry: Entry })[] = [
      ...(checkIns ?? []).map((ci) => ({ kind: "checkin" as const, date: ci.createdAt, checkIn: ci })),
      ...(entries ?? []).map((e) => ({ kind: "note" as const, date: e.entryDate, entry: e })),
    ];
    return items.sort((a, b) => b.date - a.date);
  }, [checkIns, entries]);

  if (loadingRel) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!relationship) {
    return <p className="text-sm text-muted-foreground">This relationship could not be found.</p>;
  }

  // Likes is only for dating / intimate relationships. Everyone else sees
  // the other four tabs: Overview, Quick Check-In, Timeline, Notes.
  const isIntimate = relationship.type === "intimate";
  const tabTriggerClass = "px-1 text-[11px]";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          All relationships
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Relationship options" data-testid="button-relationship-menu">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/relationships/${id}/edit`)} data-testid="menuitem-edit-relationship">
              <Pencil className="w-4 h-4" />
              Edit details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive" data-testid="menuitem-delete-relationship">
              <Trash2 className="w-4 h-4" />
              Delete relationship
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <h1 className="font-serif text-xl text-foreground" data-testid="text-relationship-name">{relationship.label}</h1>
        <p className="text-sm text-muted-foreground mt-1">{RELATIONSHIP_TYPE_LABELS[relationship.type as RelationshipType]}</p>
        {relationship.note && <p className="text-sm text-foreground mt-3">{relationship.note}</p>}
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/entries/new?relationshipId=${id}`}>
            <Button variant="outline" className="w-full" data-testid="button-new-entry">
              <Plus className="w-4 h-4" />
              Add a note
            </Button>
          </Link>
          <Button className="w-full" onClick={() => setCheckInOpen(true)} data-testid="button-open-checkin">
            <Sparkles className="w-4 h-4" />
            Full check-in
          </Button>
        </div>
        <InfoModal className="-ml-2" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full h-auto justify-between gap-0.5" data-testid="tablist-relationship">
          <TabsTrigger value="overview" className={tabTriggerClass} data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="quick" className={tabTriggerClass} data-testid="tab-quick-checkin">Quick Check-In</TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClass} data-testid="tab-history">Timeline</TabsTrigger>
          {isIntimate && (
            <TabsTrigger value="likes" className={tabTriggerClass} data-testid="tab-likes">Likes</TabsTrigger>
          )}
          <TabsTrigger value="notes" className={tabTriggerClass} data-testid="tab-notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-5 mt-5">
          {checkIns && checkIns.length > 0 ? (
            <>
              <Card className="p-5 flex flex-col items-center">
                <RadarChart
                  categories={healthySummary.map((c) => ({ label: c.categoryLabel, average: c.average, hasData: c.hasData }))}
                  size={272}
                  caption={`Your total ratings across all ${checkIns.length} check-in${checkIns.length === 1 ? "" : "s"} — your own view, not a fact. Categories you haven't rated stay blank.`}
                />
              </Card>
              {patternSummary.length > 0 && (
                <Card className="p-4">
                  <h2 className="text-sm text-foreground mb-2">Patterns across all your check-ins</h2>
                  <div className="space-y-2.5">
                    {patternSummary.map((cat) => (
                      <div key={cat.categoryKey} className="flex items-baseline justify-between gap-2" data-testid={`overview-pattern-${cat.categoryKey}`}>
                        <span className="text-sm text-foreground">{cat.categoryLabel}</span>
                        <span className="text-xs text-muted-foreground text-right">{describeCategoryLevel(cat.average)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {checkIns.length} check-in{checkIns.length === 1 ? "" : "s"} recorded.
                  </p>
                </Card>
              )}
            </>
          ) : (
            <div className="empty-state text-center py-10 px-4" data-testid="empty-state-checkins">
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                No check-ins yet. A check-in captures a moment-in-time view of how things feel with{" "}
                {relationship.label} — you can look back on it later.
              </p>
              <Button onClick={() => setCheckInOpen(true)} data-testid="button-start-first-checkin">
                <Sparkles className="w-4 h-4" />
                Start your first check-in
              </Button>
            </div>
          )}

          {themeCounts.length > 0 && (
            <Card className="p-4" data-testid="card-themes">
              <h2 className="text-sm text-foreground mb-2">Entries tagged like this appeared more than once</h2>
              <p className="text-xs text-muted-foreground mb-3">
                An observation about your entries, not a conclusion about {relationship.label}.
              </p>
              <div className="flex flex-wrap gap-2">
                {themeCounts.map(([tag, count]) => (
                  <Badge key={tag} variant="secondary" data-testid={`badge-theme-${tag.replace(/\s+/g, "-")}`}>
                    {tag} · {count}×
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {commonWords.length > 0 && (
            <Card className="p-4" data-testid="card-common-words">
              <h2 className="text-sm text-foreground mb-2">Words that come up often in your entries</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Pulled from what you've written about {relationship.label} — how often, not what it means.
              </p>
              <div className="flex flex-wrap gap-2">
                {commonWords.map(({ word, count }) => (
                  <Badge key={word} variant="outline" data-testid={`badge-word-${word}`}>
                    {word} · {count}×
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Quick Check-In */}
        <TabsContent value="quick" className="mt-5">
          <QuickCheckIn relationshipId={id!} currentRatings={ratingMap} />
        </TabsContent>

        {/* Timeline: check-ins and notes together, newest first */}
        <TabsContent value="history" className="mt-5 space-y-6">
          {hasAnyTrend && (
            <Card className="p-4 space-y-5" data-testid="card-trends">
              <h2 className="text-sm text-foreground">How your ratings have moved across check-ins</h2>
              <p className="text-xs text-muted-foreground -mt-3">Only categories you actually rated appear in these charts.</p>
              <div className="space-y-4">
                {healthyTrends.filter((t) => t.points.length >= 2).map((t) => (
                  <CategoryTrendChart key={t.label} label={t.label} points={t.points} />
                ))}
              </div>
              {patternTrends.some((t) => t.points.length >= 2) && (
                <div className="pt-2 border-t border-border space-y-4">
                  <p className="text-xs text-muted-foreground">Patterns, over time</p>
                  {patternTrends.filter((t) => t.points.length >= 2).map((t) => (
                    <CategoryTrendChart key={t.label} label={t.label} points={t.points} />
                  ))}
                </div>
              )}
            </Card>
          )}

          {timelineItems.length === 0 ? (
            <div className="empty-state text-center py-12 px-4" data-testid="empty-state-timeline">
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Nothing here yet. Your first check-in or note starts the timeline for {relationship.label}.
              </p>
            </div>
          ) : (
            <ol role="list" className="space-y-3" data-testid="list-timeline">
              {timelineItems.map((item) => {
                if (item.kind === "checkin") {
                  const ci = item.checkIn;
                  const ratings: Record<string, number> = JSON.parse(ci.ratings);
                  const healthy = summarizeHealthyCategories(ratings).filter((c) => c.hasData);
                  const patterns = summarizePatternCategories(ratings).filter((c) => c.elevatedTraits.length > 0);
                  return (
                    <li key={`ci-${ci.id}`}>
                      <Card className="p-4" data-testid={`card-checkin-${ci.id}`}>
                        <p className="text-xs text-muted-foreground mb-2">
                          Check-in · {format(new Date(ci.createdAt), "MMMM d, yyyy")}
                        </p>
                        {healthy.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {healthy.map((c) => (
                              <Badge key={c.categoryKey} variant="secondary" className="text-xs">
                                {c.categoryLabel}: {c.average.toFixed(1)}
                              </Badge>
                            ))}
                          </div>
                        ) : Object.keys(ratings).length === 0 ? (
                          <p className="text-xs text-muted-foreground mb-2">Note only. No ratings were saved.</p>
                        ) : null}
                        {patterns.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Noticed: {patterns.map((p) => p.categoryLabel).join(", ")}
                          </p>
                        )}
                        {ci.note && <p className="text-sm text-foreground italic">"{ci.note}"</p>}
                      </Card>
                    </li>
                  );
                }
                const entry = item.entry;
                return (
                  <li key={`en-${entry.id}`}>
                    <Link href={`/entries/${entry.id}`} data-testid={`link-timeline-entry-${entry.id}`}>
                      <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer">
                        <p className="text-xs text-muted-foreground mb-1">
                          Note · {format(new Date(entry.entryDate), "MMMM d, yyyy")}
                        </p>
                        <p className="text-sm text-foreground font-medium">{entry.title || "Untitled note"}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{entry.whatHappened}</p>
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </TabsContent>

        {/* Likes & dislikes -- intimate / dating relationships only */}
        {isIntimate && (
          <TabsContent value="likes" className="mt-5">
            <LikesDislikes relationshipId={id!} relationshipLabel={relationship.label} />
          </TabsContent>
        )}

        {/* Notes */}
        <TabsContent value="notes" className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-lg text-foreground">Notes</h2>
            <Link href={`/entries/new?relationshipId=${id}`}>
              <Button size="sm" variant="outline" data-testid="button-notes-add">
                <Plus className="w-4 h-4" />
                Add a note
              </Button>
            </Link>
          </div>
          {loadingEntries && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}
          {!loadingEntries && (entries ?? []).length === 0 && (
            <div className="empty-state text-center py-12 px-4" data-testid="empty-state-entries">
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                No notes yet. Write down what happened and how it felt, in your own words.
              </p>
            </div>
          )}
          {!loadingEntries && (entries ?? []).length > 0 && (
            <ol role="list" className="space-y-3" data-testid="list-notes">
              {(entries ?? []).map((entry) => {
                const emotionTags: string[] = JSON.parse(entry.emotionTags || "[]");
                const situationTags: string[] = JSON.parse(entry.situationTags || "[]");
                const linked = entry.linkedEntryId ? entryMap[entry.linkedEntryId] : undefined;
                return (
                  <li key={entry.id}>
                    <Link href={`/entries/${entry.id}`} data-testid={`link-entry-${entry.id}`}>
                      <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer">
                        <div className="flex items-baseline justify-between gap-2 mb-1.5">
                          <p className="text-sm text-foreground font-medium">
                            {entry.title || format(new Date(entry.entryDate), "MMMM d, yyyy")}
                          </p>
                          <time className="text-xs text-muted-foreground shrink-0" dateTime={new Date(entry.entryDate).toISOString()}>
                            {format(new Date(entry.entryDate), "MMM d")}
                          </time>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{entry.whatHappened}</p>
                        {(emotionTags.length > 0 || situationTags.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {[...emotionTags, ...situationTags].slice(0, 4).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-entry-tag-${tag.replace(/\s+/g, "-")}`}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {linked && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2.5">
                            <Link2 className="w-3 h-3" />
                            Connects to "{linked.title || linked.whatHappened.slice(0, 30)}"
                          </p>
                        )}
                      </Card>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </TabsContent>
      </Tabs>

      <CheckInFlow
        relationshipId={id!}
        relationshipLabel={relationship.label}
        currentRatings={ratingMap}
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this relationship?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {relationship.label} and every entry and check-in in this timeline. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
