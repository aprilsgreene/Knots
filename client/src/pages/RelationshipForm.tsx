import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Heart, Users, Home as HomeIcon, UserRound, Briefcase, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_TYPE_BEST_FEATURE,
} from "@/lib/relationshipTypes";
import type { Relationship } from "@shared/schema";

const ICONS: Record<string, any> = { intimate: Heart, sibling: Users, parent_family: HomeIcon, friend: UserRound, coworker: Briefcase, mentor_mentee: Compass };

const formSchema = z.object({
  label: z.string().min(1, "Give this relationship a private name, initials, or alias.").max(60),
  type: z.enum(RELATIONSHIP_TYPES),
  note: z.string().max(500).optional(),
});

export default function RelationshipFormPage() {
  const params = useParams<{ id?: string }>();
  const isEdit = Boolean(params.id);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: existing } = useQuery<Relationship>({
    queryKey: ["/api/relationships", params.id],
    enabled: isEdit,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    values: existing
      ? { label: existing.label, type: existing.type as any, note: existing.note ?? "" }
      : { label: "", type: "friend", note: "" },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      if (isEdit && params.id) {
        const res = await apiRequest("PATCH", `/api/relationships/${params.id}`, values);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/relationships", values);
      return res.json();
    },
    onSuccess: (data: Relationship) => {
      queryClient.invalidateQueries({ queryKey: ["/api/relationships"] });
      toast({ title: isEdit ? "Relationship updated" : "Relationship added" });
      navigate(`/relationships/${data.id}`);
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <button
        onClick={() => navigate(isEdit && params.id ? `/relationships/${params.id}` : "/")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h1 className="font-serif text-xl text-foreground">{isEdit ? "Edit relationship" : "New relationship"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Use a private name, initials, or alias — whatever feels safe to you.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-6">
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="label">Private name, initials, or alias</Label>
                <FormControl>
                  <Input id="label" placeholder='e.g. J., "my sister", Sam' {...field} data-testid="input-relationship-label" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <Label>Relationship type</Label>
                <div className="grid grid-cols-2 gap-2 pt-1" role="radiogroup" aria-label="Relationship type">
                  {RELATIONSHIP_TYPES.map((type) => {
                    const Icon = ICONS[type];
                    const active = field.value === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => field.onChange(type)}
                        data-testid={`button-type-${type}`}
                        className={cn(
                          "flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left hover-elevate active-elevate-2",
                          active ? "border-primary bg-accent" : "border-card-border bg-card"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground")} strokeWidth={1.75} />
                        <span className="text-sm text-foreground leading-tight">{RELATIONSHIP_TYPE_LABELS[type]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground pt-1" data-testid="text-type-best-feature">
                  {RELATIONSHIP_TYPE_BEST_FEATURE[field.value]}
                </p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <Label htmlFor="note">Context note (optional)</Label>
                <FormControl>
                  <Textarea
                    id="note"
                    rows={3}
                    placeholder="Anything you want to remember about who this is, for your own reference."
                    {...field}
                    data-testid="input-relationship-note"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={saveMutation.isPending} data-testid="button-save-relationship">
            {saveMutation.isPending ? "Saving..." : isEdit ? "Save changes" : "Add relationship"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
