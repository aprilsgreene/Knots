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
  Zap,
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
import { TraitSlider } from "@/components/TraitSlider";
import { RadarChart } from "@/components/RadarChart";
import { CategoryTrendChart } from "@/components/CategoryTrendChart";
import { CheckInFlow } from "@/components/CheckInFlow";
import { QuickCheckIn } from "@/components/QuickCheckIn";
import { LikesDislikes } from "@/components/LikesDislikes";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { topWords } from "@/lib/wordFrequency";
import { useToast } from "@/hooks/use-toast";
import {
  RELATIONSHIP_TYPE_LABELS,
  HEALTHY_CATEGORIES,
  PATTERN_CATEGORIES,
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
  const [quickCheckInOpen, setQuickCheckInOpen] = useState(false);
  const [activeHealthyTab, setActiveHealthyTab] = useState(HEALTHY_CATEGORIES[0].key);
  const [activePatternTab, setActivePatternTab] = useState(PATTERN_CATEGORIES[0].key);

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

  const traitMutation = useMutation({
    mutationFn: async ({ traitKey, value }: { traitKey: string; value: number }) => {
      const res = await apiRequest("PUT", `/api/relationships/${id}/traits/${traitKey}`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships", id, "traits"] });
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
  const patternSummary = useMemo(() => summarizePatternCategories(overallRatingMap), [overallRatingMap]);

  // Per-category trend series across check-ins, oldest first, for the
  // History tab's small charts. Purely descriptive, no judgment language.
  const healthyTrends = useMemo(() => {
    const ordered = [...(checkIns ?? [])].sort((a, b) => a.createdAt - b.createdAt);
    return HEALTHY_CATEGORIES.map((cat) => ({
      label: cat.label,
      points: ordered.map((ci) => {
        const ratings: Record<string, number> = JSON.parse(ci.ratings);
        const vals = cat.traits.map((t) => ratings[t.key] ?? 5);
        return { date: ci.createdAt, average: vals.reduce((a, b) => a + b, 0) / vals.length };
      }),
    }));
  }, [checkIns]);

  const patternTrends = useMemo(() => {
    const ordered = [...(checkIns ?? [])].sort((a, b) => a.createdAt - b.createdAt);
    return PATTERN_CATEGORIES.map((cat) => ({
      label: cat.label,
      points: ordered.map((ci) => {
        const ratings: Record<string, number> = JSON.parse(ci.ratings);
        const vals = cat.traits.map((t) => ratings[t.key] ?? 1);
        return { date: ci.createdAt, average: vals.reduce((a, b) => a + b, 0) / vals.length };
      }),
    }));
  }, [checkIns]);

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

  // The Likes & dislikes tab is for dating / intimate relationships.
  const isIntimate = relationship.type === "intimate";
  // Slightly tighter tabs so six fit on a phone without words running together.
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

      <div className="grid grid-cols-2 gap-2">
        <Link href={`/entries/new?relationshipId=${id}`}>
          <Button variant="outline" className="w-full" data-testid="button-new-entry">
            <Plus className="w-4 h-4" />
            Add a note
          </Button>
        </Link>
        <Button className="w-full" onClick={() => setCheckInOpen(true)} data-testid="button-open-checkin">
          <Sparkles className="w-4 h-4" />
          Check in
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex w-full h-auto justify-between gap-0.5">
          <TabsTrigger value="overview" className={tabTriggerClass} data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="traits" className={tabTriggerClass} data-testid="tab-traits">Traits</TabsTrigger>
          <button
            type="button"
            onClick={() => setQuickCheckInOpen(true)}
            data-testid="tab-quick-checkin"
            className="inline-flex shrink-0 flex-col items-center justify-center gap-0.5 whitespace-normal rounded-xs px-0.5 py-1.5 text-[11px] font-medium leading-tight text-muted-foreground ring-offset-background transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Quick<br />check-in
          </button>
          <TabsTrigger value="patterns" className={tabTriggerClass} data-testid="tab-patterns">Patterns</TabsTrigger>
          <TabsTrigger value="history" className={tabTriggerClass} data-testid="tab-history">Timeline</TabsTrigger>
          {isIntimate && (
            <TabsTrigger value="likes" className={tabTriggerClass} data-testid="tab-likes">Likes</TabsTrigger>
          )}
        </TabsList>

        {/* Likes & dislikes -- intimate / dating relationships only */}
        {isIntimate && (
          <TabsContent value="likes" className="mt-5">
            <LikesDislikes relationshipId={id!} relationshipLabel={relationship.label} />
          </TabsContent>
        )}

        {/* Overview */}
        <TabsContent value="overview" className="space-y-5 mt-5">
          {checkIns && checkIns.length > 0 ? (
            <>
              <Card className="p-5 flex flex-col items-center">
                <RadarChart
                  categories={healthySummary.map((c) => ({ label: c.categoryLabel, average: c.average }))}
                  size={272}
                  caption={`Your total ratings across all ${checkIns.length} check-in${checkIns.length === 1 ? "" : "s"} — your own view, not a fact.`}
                />
              </Card>
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

        {/* Traits */}
        <TabsContent value="traits" className="mt-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            The same five dimensions for every relationship. These reflect your latest check-in and can be
            adjusted anytime — always your own tentative ratings, never a fixed fact about {relationship.label}.
          </p>
          <Tabs value={activeHealthyTab} onValueChange={setActiveHealthyTab}>
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
              {HEALTHY_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.key} value={cat.key} className="text-xs" data-testid={`tab-detail-healthy-${cat.key}`}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {HEALTHY_CATEGORIES.map((cat) => (
              <TabsContent key={cat.key} value={cat.key} className="mt-4">
                <Card className="p-4 space-y-5">
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                  {cat.traits.map((trait) => (
                    <TraitSlider
                      key={trait.key}
                      trait={trait}
                      value={ratingMap[trait.key] ?? 5}
                      onChange={(value) => traitMutation.mutate({ traitKey: trait.key, value })}
                    />
                  ))}
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* Patterns */}
        <TabsContent value="patterns" className="mt-5 space-y-4">
          <div className="rounded-md border border-border bg-muted/50 px-3.5 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              These track moments you experienced or noticed — not a label placed on {relationship.label}. Rate how
              often each has come up for you. Nothing here computes a score or tells you what to do.
            </p>
          </div>
          <Tabs value={activePatternTab} onValueChange={setActivePatternTab}>
            <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
              {PATTERN_CATEGORIES.map((cat) => (
                <TabsTrigger key={cat.key} value={cat.key} className="text-xs" data-testid={`tab-detail-pattern-${cat.key}`}>
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {PATTERN_CATEGORIES.map((cat) => (
              <TabsContent key={cat.key} value={cat.key} className="mt-4">
                <Card className="p-4 space-y-5">
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                  {cat.traits.map((trait) => (
                    <TraitSlider
                      key={trait.key}
                      trait={trait}
                      value={ratingMap[trait.key] ?? 1}
                      onChange={(value) => traitMutation.mutate({ traitKey: trait.key, value })}
                    />
                  ))}
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>

        {/* History / Timeline */}
        <TabsContent value="history" className="mt-5 space-y-6">
          {checkIns && checkIns.length >= 2 && (
            <Card className="p-4 space-y-5" data-testid="card-trends">
              <h2 className="text-sm text-foreground">How your ratings have moved across check-ins</h2>
              <div className="space-y-4">
                {healthyTrends.map((t) => (
                  <CategoryTrendChart key={t.label} label={t.label} points={t.points} />
                ))}
              </div>
              <div className="pt-2 border-t border-border space-y-4">
                <p className="text-xs text-muted-foreground">Patterns, over time</p>
                {patternTrends.map((t) => (
                  <CategoryTrendChart key={t.label} label={t.label} points={t.points} />
                ))}
              </div>
            </Card>
          )}

          <div>
            <h2 className="font-serif text-lg text-foreground mb-3">Check-ins</h2>
            {!checkIns || checkIns.length === 0 ? (
              <p className="text-sm text-muted-foreground" data-testid="empty-state-checkin-history">
                No check-ins recorded yet.
              </p>
            ) : (
              <ol role="list" className="space-y-3" data-testid="list-checkins">
                {checkIns.map((ci) => {
                  const ratings: Record<string, number> = JSON.parse(ci.ratings);
                  const healthy = summarizeHealthyCategories(ratings);
                  const patterns = summarizePatternCategories(ratings).filter((c) => c.elevatedTraits.length > 0);
                  return (
                    <li key={ci.id}>
                      <Card className="p-4" data-testid={`card-checkin-${ci.id}`}>
                        <p className="text-xs text-muted-foreground mb-2">{format(new Date(ci.createdAt), "MMMM d, yyyy")}</p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {healthy.map((c) => (
                            <Badge key={c.categoryKey} variant="secondary" className="text-xs">
                              {c.categoryLabel}: {c.average.toFixed(1)}
                            </Badge>
                          ))}
                        </div>
                        {patterns.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Noticed: {patterns.map((p) => p.categoryLabel).join(", ")}
                          </p>
                        )}
                        {ci.note && <p className="text-sm text-foreground italic">"{ci.note}"</p>}
                      </Card>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div>
            <h2 className="font-serif text-lg text-foreground mb-3">Entries</h2>
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
                  No entries yet. Your first note starts the timeline for {relationship.label}.
                </p>
              </div>
            )}
            {!loadingEntries && (entries ?? []).length > 0 && (
              <ol role="list" className="space-y-3" data-testid="list-timeline">
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
          </div>
        </TabsContent>
      </Tabs>

      <CheckInFlow
        relationshipId={id!}
        relationshipLabel={relationship.label}
        currentRatings={ratingMap}
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
      />

      <QuickCheckIn
        relationshipId={id!}
        category={HEALTHY_CATEGORIES.find((c) => c.key === activeHealthyTab)!}
        currentRatings={ratingMap}
        defaultValue={5}
        open={quickCheckInOpen}
        onClose={() => setQuickCheckInOpen(false)}
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
