import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Trash2, MoreVertical, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Entry, Relationship } from "@shared/schema";

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default function EntryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: entry, isLoading } = useQuery<Entry>({ queryKey: ["/api/entries", id] });
  const { data: relationship } = useQuery<Relationship>({
    queryKey: ["/api/relationships", entry?.relationshipId],
    enabled: Boolean(entry?.relationshipId),
  });
  const { data: linked } = useQuery<Entry>({
    queryKey: ["/api/entries", entry?.linkedEntryId],
    enabled: Boolean(entry?.linkedEntryId),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/entries/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({ title: "Entry deleted" });
      navigate(entry ? `/relationships/${entry.relationshipId}` : "/");
    },
  });

  if (isLoading || !entry) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const emotionTags: string[] = JSON.parse(entry.emotionTags || "[]");
  const situationTags: string[] = JSON.parse(entry.situationTags || "[]");

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/relationships/${entry.relationshipId}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          {relationship?.label ?? "Timeline"}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Entry options" data-testid="button-entry-menu">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`/entries/${id}/edit`)} data-testid="menuitem-edit-entry">
              <Pencil className="w-4 h-4" />
              Edit entry
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive" data-testid="menuitem-delete-entry">
              <Trash2 className="w-4 h-4" />
              Delete entry
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div>
        <h1 className="font-serif text-xl text-foreground" data-testid="text-entry-title">
          {entry.title || format(new Date(entry.entryDate), "MMMM d, yyyy")}
        </h1>
        <time className="text-sm text-muted-foreground" dateTime={new Date(entry.entryDate).toISOString()}>
          {format(new Date(entry.entryDate), "EEEE, MMMM d, yyyy")}
        </time>
      </div>

      {(emotionTags.length > 0 || situationTags.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {[...emotionTags, ...situationTags].map((tag) => (
            <Badge key={tag} variant="secondary" data-testid={`badge-tag-${tag.replace(/\s+/g, "-")}`}>
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Card className="p-4 space-y-4">
        <Field label="What happened" value={entry.whatHappened} />
        <Field label="How I felt" value={entry.feelings} />
        <Field label="What I noticed in my body" value={entry.bodyNotice} />
        <Field label="What I needed or hoped for" value={entry.needHope} />
        <Field label="What followed" value={entry.whatFollowed} />
        <Field label="What I want to remember" value={entry.remember} />
      </Card>

      {linked && (
        <Link href={`/entries/${linked.id}`} data-testid="link-connected-entry">
          <Card className="p-4 hover-elevate active-elevate-2 cursor-pointer flex items-start gap-2.5">
            <Link2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Connects to</p>
              <p className="text-sm text-foreground">{linked.title || linked.whatHappened.slice(0, 60)}</p>
            </div>
          </Card>
        </Link>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes it from the timeline. This cannot be undone.</AlertDialogDescription>
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
