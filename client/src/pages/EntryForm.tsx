import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagPicker } from "@/components/TagPicker";
import { SafetyNotice } from "@/components/SafetyNotice";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SUGGESTED_EMOTIONAL_TAGS, SUGGESTED_SITUATIONAL_TAGS } from "@/lib/relationshipTypes";
import type { Entry, Relationship } from "@shared/schema";

const formSchema = z.object({
  title: z.string().max(80).optional(),
  whatHappened: z.string().min(1, "Say a little about what happened.").max(4000),
  feelings: z.string().max(2000).optional(),
  bodyNotice: z.string().max(1000).optional(),
  needHope: z.string().max(1000).optional(),
  whatFollowed: z.string().max(2000).optional(),
  remember: z.string().max(1000).optional(),
  linkedEntryId: z.string().optional(),
});

export default function EntryFormPage() {
  const params = useParams<{ relationshipId?: string; entryId?: string }>();
  const search = useSearch();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isEdit = Boolean(params.entryId);

  const relationshipId = params.relationshipId ?? new URLSearchParams(search).get("relationshipId") ?? "";

  const { data: relationship } = useQuery<Relationship>({
    queryKey: ["/api/relationships", relationshipId],
    enabled: Boolean(relationshipId),
  });

  const { data: existingEntry } = useQuery<Entry>({
    queryKey: ["/api/entries", params.entryId],
    enabled: isEdit,
  });

  const { data: priorEntries } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { relationshipId }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/entries?relationshipId=${relationshipId}`);
      return res.json();
    },
    enabled: Boolean(relationshipId),
  });

  const [emotionTags, setEmotionTags] = useState<string[]>([]);
  const [situationTags, setSituationTags] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: existingEntry
      ? {
          title: existingEntry.title ?? "",
          whatHappened: existingEntry.whatHappened,
          feelings: existingEntry.feelings ?? "",
          bodyNotice: existingEntry.bodyNotice ?? "",
          needHope: existingEntry.needHope ?? "",
          whatFollowed: existingEntry.whatFollowed ?? "",
          remember: existingEntry.remember ?? "",
          linkedEntryId: existingEntry.linkedEntryId ?? "",
        }
      : {
          title: "",
          whatHappened: "",
          feelings: "",
          bodyNotice: "",
          needHope: "",
          whatFollowed: "",
          remember: "",
          linkedEntryId: "",
        },
  });

  // Sync tag state once existing entry loads
  useMemo(() => {
    if (existingEntry) {
      setEmotionTags(JSON.parse(existingEntry.emotionTags || "[]"));
      setSituationTags(JSON.parse(existingEntry.situationTags || "[]"));
    }
  }, [existingEntry]);

  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const payload = {
        ...values,
        relationshipId,
        emotionTags,
        situationTags,
        linkedEntryId: values.linkedEntryId || undefined,
        entryDate: existingEntry?.entryDate ?? Date.now(),
      };
      if (isEdit && params.entryId) {
        const res = await apiRequest("PATCH", `/api/entries/${params.entryId}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/entries", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      toast({ title: "Saved privately" });
      navigate(`/relationships/${relationshipId}`);
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  const otherEntries = (priorEntries ?? []).filter((e) => e.id !== params.entryId);

  return (
    <div className="space-y-6 max-w-lg">
      <button
        onClick={() => navigate(isEdit && existingEntry ? `/relationships/${existingEntry.relationshipId}` : relationshipId ? `/relationships/${relationshipId}` : "/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="font-serif text-xl text-foreground">{isEdit ? "Edit entry" : "New entry"}</h1>
        {relationship && (
          <p className="text-sm text-muted-foreground mt-1">
            About <span className="text-foreground">{relationship.label}</span>
          </p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-7">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="title">Give this moment a short label (optional)</Label>
                <FormControl>
                  <Input id="title" placeholder="e.g. Sunday phone call" {...field} data-testid="input-entry-title" />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatHappened"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="whatHappened">What happened?</Label>
                <p className="text-xs text-muted-foreground">Describe the event itself, not a judgment about them.</p>
                <FormControl>
                  <Textarea id="whatHappened" rows={4} placeholder="A brief, observable description..." {...field} data-testid="input-entry-what-happened" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="feelings"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="feelings">How did you feel?</Label>
                <TagPicker
                  label="Emotion words (optional)"
                  suggestions={SUGGESTED_EMOTIONAL_TAGS}
                  selected={emotionTags}
                  onChange={setEmotionTags}
                  testIdPrefix="tag-emotion"
                />
                <FormControl>
                  <Textarea id="feelings" rows={2} placeholder="Anything else, in your own words..." {...field} data-testid="input-entry-feelings" />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bodyNotice"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="bodyNotice">What did you notice in your body? (optional, never required)</Label>
                <FormControl>
                  <Textarea id="bodyNotice" rows={2} placeholder="e.g. tight chest, calm, tired..." {...field} data-testid="input-entry-body" />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="needHope"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="needHope">What did you need or hope for? (optional)</Label>
                <FormControl>
                  <Textarea id="needHope" rows={2} placeholder="What would have helped you feel supported or clear?" {...field} data-testid="input-entry-need" />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="whatFollowed"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="whatFollowed">What followed? (optional)</Label>
                <p className="text-xs text-muted-foreground">A response, repair, change, or something still unresolved.</p>
                <FormControl>
                  <Textarea id="whatFollowed" rows={3} {...field} data-testid="input-entry-followed" />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Situational tags (optional)</Label>
            <TagPicker
              label=""
              suggestions={SUGGESTED_SITUATIONAL_TAGS}
              selected={situationTags}
              onChange={setSituationTags}
              testIdPrefix="tag-situation"
            />
          </div>

          {otherEntries.length > 0 && (
            <FormField
              control={form.control}
              name="linkedEntryId"
              render={({ field }) => (
                <FormItem>
                  <Label>Does this connect to another moment? (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-linked-entry" className="flex-1">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <SelectValue placeholder="Link a prior entry" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {otherEntries.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.title || e.whatHappened.slice(0, 40)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.value && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => field.onChange("")} aria-label="Remove link" data-testid="button-remove-link">
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="remember"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="remember">What do you want to remember? (private note)</Label>
                <FormControl>
                  <Textarea id="remember" rows={2} {...field} data-testid="input-entry-remember" />
                </FormControl>
              </FormItem>
            )}
          />

          <SafetyNotice compact />

          <Button type="submit" className="w-full" disabled={saveMutation.isPending} data-testid="button-save-entry">
            {saveMutation.isPending ? "Saving..." : "Save privately"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
