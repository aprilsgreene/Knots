import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, ChevronRight, Heart, Users, Home as HomeIcon, UserRound, Briefcase, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Relationship } from "@shared/schema";
import { RELATIONSHIP_TYPE_LABELS } from "@/lib/relationshipTypes";
import { CrossRelationshipPatterns } from "@/components/CrossRelationshipPatterns";

const ICONS: Record<string, any> = { Heart, Users, Home: HomeIcon, UserRound, Briefcase, Compass };
const TYPE_ICON: Record<string, string> = {
  intimate: "Heart",
  sibling: "Users",
  parent_family: "Home",
  friend: "UserRound",
  coworker: "Briefcase",
  mentor_mentee: "Compass",
};

export default function HomePage() {
  const { data: relationships, isLoading } = useQuery<Relationship[]>({
    queryKey: ["/api/relationships"],
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-xl text-foreground">Your relationships</h1>
          <p className="text-sm text-muted-foreground mt-1">Private. Only you can see these.</p>
        </div>
        <Link href="/relationships/new">
          <Button data-testid="button-new-relationship">
            <Plus className="w-4 h-4" />
            New
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-card-border bg-card p-4 flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && relationships && relationships.length === 0 && (
        <div className="empty-state flex flex-col items-center text-center py-16 px-6" data-testid="empty-state-relationships">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-accent-foreground" strokeWidth={1.75} />
          </div>
          <h2 className="font-serif text-lg text-foreground mb-2">No relationships yet</h2>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Start with someone who's on your mind — a partner, a sibling, a friend, a coworker. You can
            always add more later.
          </p>
          <Link href="/relationships/new">
            <Button data-testid="button-empty-new-relationship">
              <Plus className="w-4 h-4" />
              Add your first relationship
            </Button>
          </Link>
        </div>
      )}

      {!isLoading && relationships && relationships.length > 0 && (
        <ul role="list" className="space-y-2.5" data-testid="list-relationships">
          {relationships.map((rel) => {
            const Icon = ICONS[TYPE_ICON[rel.type]] ?? Users;
            return (
              <li key={rel.id}>
                <Link href={`/relationships/${rel.id}`} data-testid={`link-relationship-${rel.id}`}>
                  <Card className="p-4 flex items-center gap-3 hover-elevate active-elevate-2 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-accent-foreground" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-foreground truncate" data-testid={`text-relationship-label-${rel.id}`}>
                        {rel.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{RELATIONSHIP_TYPE_LABELS[rel.type as keyof typeof RELATIONSHIP_TYPE_LABELS]}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!isLoading && relationships && relationships.length > 1 && (
        <CrossRelationshipPatterns relationships={relationships} />
      )}
    </div>
  );
}
