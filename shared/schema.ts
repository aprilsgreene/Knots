import { pgTable, text, integer, boolean, bigint, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Relationship types supported by the app. Each has its own vocabulary but
// shares the same underlying entry/tag/timeline model.
// ---------------------------------------------------------------------------
export const RELATIONSHIP_TYPES = [
  "intimate",
  "sibling",
  "parent_family",
  "friend",
  "coworker",
  "mentor_mentee",
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const THEME_MODES = ["light", "dark", "system"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

// Traits are framed as observable, user-defined dimensions rather than
// universal personality scores. Direction indicates whether a HIGH rating
// (10) reads as "more of this quality, framed positively" or a HIGH rating
// reads as "more of this quality, framed as something to watch" -- the UI
// never says "good/bad", it just anchors the two ends of the scale in the
// trait's own words.
export type TraitDef = {
  key: string;
  label: string;
  description: string; // one line describing what this dimension is about
  lowAnchor: string; // what 1 means, in the user's own frame
  highAnchor: string; // what 10 means, in the user's own frame
  /** true when a HIGH rating reads as "more of a pattern to watch", not as a positive quality */
  watch?: boolean;
};

export type TraitCategoryDef = {
  key: string;
  label: string;
  description: string;
  traits: TraitDef[];
};

// -----------------------------------------------------------------------
// Universal healthy-dimension categories. These apply to every relationship
// type -- the same 25 tentative, observable dimensions, so a check-in for a
// sibling and a check-in for a partner speak the same language over time.
// Framed as "what I've noticed", never as a fact about the other person.
// -----------------------------------------------------------------------
export const HEALTHY_CATEGORIES: TraitCategoryDef[] = [
  {
    key: "emotional_landscape",
    label: "Emotional Landscape",
    description: "How feelings tend to move in this relationship, from your seat",
    traits: [
      { key: "calm_after_friction", label: "Calm after friction", description: "How things feel once a tense moment has passed", lowAnchor: "Stays tense a long time", highAnchor: "Settles back to calm" },
      { key: "ease_i_feel", label: "Ease I feel around them", description: "My own sense of ease or unease in their presence", lowAnchor: "I feel on edge", highAnchor: "I feel at ease" },
      { key: "worry_i_carry", label: "Worry I carry about this", description: "How much I find myself worrying between interactions", lowAnchor: "Rarely worry", highAnchor: "Worry often", watch: true },
      { key: "mood_predictability", label: "Predictability of their mood", description: "How steady or shifting their mood feels to me", lowAnchor: "Shifts a lot", highAnchor: "Feels steady" },
      { key: "empathy_i_notice", label: "Empathy I notice from them", description: "How much they seem to register and respond to my feelings", lowAnchor: "Rarely notice it", highAnchor: "Notice it often" },
    ],
  },
  {
    key: "relational_dynamics",
    label: "Relational Dynamics",
    description: "The give-and-take, closeness, and boundaries between us",
    traits: [
      { key: "reciprocity", label: "Reciprocity", description: "Whether effort and care seem to flow both ways", lowAnchor: "Feels one-sided", highAnchor: "Feels mutual" },
      { key: "boundary_respect", label: "Boundary respect", description: "Whether the limits I set are acknowledged and kept", lowAnchor: "Often crossed", highAnchor: "Consistently respected" },
      { key: "pressure_to_stay_close", label: "Pressure to stay close", description: "How much pull I feel to be more available than I want to be", lowAnchor: "Rarely feel pulled", highAnchor: "Often feel pulled", watch: true },
      { key: "independence_room", label: "Room for independence", description: "How much space there is for me to have my own life", lowAnchor: "Feels crowded", highAnchor: "Feels spacious" },
      { key: "availability", label: "Availability", description: "Emotional and practical presence when it matters", lowAnchor: "Rarely present", highAnchor: "Consistently present" },
    ],
  },
  {
    key: "character_and_values",
    label: "Character & Values",
    description: "What I've observed about how they show up, over time",
    traits: [
      { key: "warmth_i_notice", label: "Warmth I notice", description: "Generosity and kindness I've seen in our interactions", lowAnchor: "Rarely notice it", highAnchor: "Notice it often" },
      { key: "follow_through", label: "Follow-through", description: "Whether words and actions tend to match, in my experience", lowAnchor: "Rarely matches", highAnchor: "Usually matches" },
      { key: "honesty_i_experience", label: "Honesty I experience", description: "How truthful and transparent things feel to me", lowAnchor: "Often feels deceptive", highAnchor: "Feels transparent" },
      { key: "consistency", label: "Consistency", description: "How reliably they show up the same way over time", lowAnchor: "Unpredictable", highAnchor: "Reliable" },
      { key: "self_focus_i_notice", label: "Self-focus I notice", description: "How much conversations and decisions seem to center on them", lowAnchor: "Rarely centers on them", highAnchor: "Often centers on them", watch: true },
    ],
  },
  {
    key: "communication",
    label: "Communication",
    description: "How we talk, listen, and work through disagreement",
    traits: [
      { key: "feeling_heard", label: "Feeling heard", description: "How much I feel actually listened to, not just heard out", lowAnchor: "Rarely feel heard", highAnchor: "Often feel heard" },
      { key: "conflict_repair", label: "Repair after conflict", description: "Whether disagreements tend to get resolved or linger", lowAnchor: "Rarely repaired", highAnchor: "Repaired well" },
      { key: "openness_i_feel", label: "Openness I feel to be vulnerable", description: "My own comfort sharing something real with them", lowAnchor: "Guarded", highAnchor: "Open" },
      { key: "clarity", label: "Clarity", description: "How clearly they tend to express what they mean", lowAnchor: "Often unclear", highAnchor: "Usually clear" },
      { key: "receptiveness_i_notice", label: "Receptiveness I notice", description: "How open they seem to feedback or a different point of view", lowAnchor: "Seems defensive", highAnchor: "Seems open" },
    ],
  },
  {
    key: "growth_and_alignment",
    label: "Growth & Alignment",
    description: "Whether this relationship seems to be moving somewhere good, for both of us",
    traits: [
      { key: "values_alignment", label: "Values alignment", description: "How closely our core values seem to line up", lowAnchor: "Often misaligned", highAnchor: "Closely aligned" },
      { key: "room_to_grow", label: "Room to grow", description: "Whether change and difference are welcomed here", lowAnchor: "Feels fixed", highAnchor: "Feels open to change" },
      { key: "accountability_i_notice", label: "Accountability I notice", description: "How mistakes tend to get owned, in my experience", lowAnchor: "Rarely owned", highAnchor: "Usually owned" },
      { key: "shared_joy", label: "Shared joy", description: "How often lightness and enjoyment show up between us", lowAnchor: "Rarely present", highAnchor: "Often present" },
      { key: "hope_for_this", label: "Hope I feel for this relationship", description: "My own sense of hope about where this is headed", lowAnchor: "Low hope right now", highAnchor: "Feeling hopeful" },
    ],
  },
];

// -----------------------------------------------------------------------
// Observational pattern categories. These are optional, clearly separated
// from the healthy categories, and reworded away from clinical/diagnostic
// language (no "narcissistic", "sociopathic", "gaslighting", etc.). Every
// trait describes something the USER experienced or noticed -- never a
// label placed on the other person. High ratings mean "I've noticed this
// pattern more", not "this person is X". There is no score, risk level, or
// verdict computed from these -- see checkIns / pattern-summary logic.
// -----------------------------------------------------------------------
export const PATTERN_CATEGORIES: TraitCategoryDef[] = [
  {
    key: "self_focus_and_entitlement",
    label: "Self-Focus & Entitlement",
    description: "Moments where things felt centered on them, or like my needs came second",
    traits: [
      { key: "p_grandiosity", label: "Outsized sense of importance", description: "How often their sense of self seemed inflated relative to the moment", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_entitlement", label: "Expecting special treatment", description: "How often they seemed to expect more than felt reasonable to me", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_admiration_seeking", label: "Needing constant praise", description: "How often reassurance or admiration seemed to be required from me", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_dismissed_feelings", label: "My feelings being brushed aside", description: "How often I felt my emotions were minimized or ignored", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
      { key: "p_used_for_gain", label: "Feeling used for something", description: "How often I sensed the relationship was serving their gain more than mutual care", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
    ],
  },
  {
    key: "honesty_and_accountability_patterns",
    label: "Honesty & Accountability Patterns",
    description: "Moments involving truthfulness, consequences, or taking responsibility",
    traits: [
      { key: "p_little_remorse", label: "Little remorse after causing hurt", description: "How often an apology or acknowledgment seemed missing after I was hurt", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_stories_shifted", label: "Their account of events shifting", description: "How often what they said happened seemed to change over time", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_disregard_for_consequences", label: "Disregard for consequences", description: "How often actions seemed to ignore likely effects on others or me", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_charm_then_shift", label: "Charm that shifted once I was invested", description: "How often warmth seemed to change after trust was established", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_rules_dont_apply", label: "Rules feeling like they don't apply to them", description: "How often agreed norms or limits seemed set aside", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
    ],
  },
  {
    key: "pressure_and_confusion_patterns",
    label: "Pressure & Confusion Patterns",
    description: "Moments where I felt pressured, guilty, confused about reality, or cut off from support",
    traits: [
      { key: "p_questioned_my_reality", label: "I've felt my sense of reality questioned", description: "How often I left an interaction unsure what actually happened or how I felt", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
      { key: "p_guilt_pressure", label: "Pressure through guilt", description: "How often guilt seemed to be used to get me to act a certain way", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
      { key: "p_pulled_from_support", label: "Feeling pulled away from other support", description: "How often I felt encouraged to distance from friends, family, or other support", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
      { key: "p_affection_swings", label: "Big swings between closeness and coldness", description: "How often warmth and distance alternated in ways that felt hard to predict", lowAnchor: "Rarely noticed", highAnchor: "Noticed often", watch: true },
      { key: "p_blame_landed_on_me", label: "Blame landing on me", description: "How often issues seemed to become my fault regardless of what happened", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
    ],
  },
  {
    key: "autonomy_and_control_patterns",
    label: "Autonomy & Control Patterns",
    description: "Moments touching on control over my choices, money, privacy, or freedom",
    traits: [
      { key: "p_coercive_pressure", label: "Pressured through threats or force", description: "How often I felt coerced into a decision through threats, force, or intimidation", lowAnchor: "Never felt this", highAnchor: "Felt this often", watch: true },
      { key: "p_financial_control", label: "Money used as leverage", description: "How often finances were controlled or withheld in a way that felt like leverage over me", lowAnchor: "Never felt this", highAnchor: "Felt this often", watch: true },
      { key: "p_privacy_monitored", label: "My privacy being monitored", description: "How often my messages, whereabouts, or activity were tracked without my comfort", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
      { key: "p_jealousy_limiting_me", label: "Jealousy limiting my freedom", description: "How often jealousy seemed to be used to restrict where I went or who I saw", lowAnchor: "Rarely felt", highAnchor: "Felt often", watch: true },
      { key: "p_ultimatums", label: "All-or-nothing demands", description: "How often I faced an ultimatum instead of a conversation", lowAnchor: "Rarely faced", highAnchor: "Faced often", watch: true },
    ],
  },
];

export const ALL_HEALTHY_TRAITS: (TraitDef & { categoryKey: string; categoryLabel: string })[] =
  HEALTHY_CATEGORIES.flatMap((c) => c.traits.map((t) => ({ ...t, categoryKey: c.key, categoryLabel: c.label })));

export const ALL_PATTERN_TRAITS: (TraitDef & { categoryKey: string; categoryLabel: string })[] =
  PATTERN_CATEGORIES.flatMap((c) => c.traits.map((t) => ({ ...t, categoryKey: c.key, categoryLabel: c.label })));

export const ALL_TRAIT_DEFS = [...ALL_HEALTHY_TRAITS, ...ALL_PATTERN_TRAITS];

export const RELATIONSHIP_TYPE_LABELS: Record<RelationshipType, string> = {
  intimate: "Intimate / Dating",
  sibling: "Sibling",
  parent_family: "Parent / Family",
  friend: "Friend",
  coworker: "Coworker / Business Partner",
  mentor_mentee: "Mentor / Mentee",
};

// Suggested tag vocabulary per category -- users can also create their own.
export const SUGGESTED_EMOTIONAL_TAGS = [
  "grateful", "hopeful", "connected", "at ease", "proud", "relieved",
  "hurt", "anxious", "frustrated", "sad", "lonely", "resentful",
  "confused", "numb", "overwhelmed", "safe", "loved", "unseen",
];

export const SUGGESTED_SITUATIONAL_TAGS = [
  "conflict", "repair attempt", "celebration", "boundary set",
  "boundary crossed", "good conversation", "misunderstanding",
  "support given", "support received", "distance", "reconnection",
  "holiday", "money", "caregiving", "unresolved",
];

// ---------------------------------------------------------------------------
// Likes & dislikes -- a simple "getting to know them" list. These are things
// the other person has told you or that you've noticed, in your own words.
// Never scored, ranked, or interpreted.
// ---------------------------------------------------------------------------
export const PREFERENCE_KINDS = ["like", "dislike"] as const;
export type PreferenceKind = (typeof PREFERENCE_KINDS)[number];

export type PreferenceCategoryDef = {
  key: string;
  label: string;
  placeholderLike: string;
  placeholderDislike: string;
};

export const PREFERENCE_CATEGORIES: PreferenceCategoryDef[] = [
  { key: "food_drink", label: "Food & drink", placeholderLike: "e.g. spicy noodles, oat-milk lattes", placeholderDislike: "e.g. cilantro, loud restaurants" },
  { key: "dates_activities", label: "Dates & activities", placeholderLike: "e.g. long walks, gallery nights", placeholderDislike: "e.g. crowded clubs, surprise plans" },
  { key: "affection_closeness", label: "Affection & closeness", placeholderLike: "e.g. forehead kisses, holding hands", placeholderDislike: "e.g. affection in public, being tickled" },
  { key: "communication", label: "Communication", placeholderLike: "e.g. a good-morning text, voice notes", placeholderDislike: "e.g. long phone calls, being left on read" },
  { key: "gifts_gestures", label: "Gifts & little gestures", placeholderLike: "e.g. handwritten notes, fresh flowers", placeholderDislike: "e.g. big public surprises" },
  { key: "music_media", label: "Music, shows & books", placeholderLike: "e.g. old soul records, period dramas", placeholderDislike: "e.g. horror movies, spoilers" },
  { key: "comfort_boundaries", label: "Comfort & boundaries", placeholderLike: "e.g. time alone after a long day", placeholderDislike: "e.g. unannounced visits, pressure to rush" },
  { key: "other", label: "Something else", placeholderLike: "Anything else you've learned", placeholderDislike: "Anything else you've learned" },
];

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

// Every content table carries a userId (references Supabase auth.users.id)
// so Row Level Security can scope each tester's data to themselves. Rows
// are never shared across accounts.
export const relationships = pgTable("relationships", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  label: text("label").notNull(), // private name, initials, or alias
  type: text("type").notNull(), // RelationshipType
  note: text("note"), // optional private context note
  archived: boolean("archived").notNull().default(false),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const entries = pgTable("entries", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  relationshipId: text("relationship_id").notNull(),
  title: text("title"), // optional short label for the entry
  whatHappened: text("what_happened").notNull(),
  feelings: text("feelings"), // free text
  bodyNotice: text("body_notice"), // optional, never required
  needHope: text("need_hope"), // optional "what did you need or hope for"
  whatFollowed: text("what_followed"), // optional repair/response/unresolved note
  remember: text("remember"), // private note - "what do you want to remember"
  emotionTags: text("emotion_tags").notNull().default("[]"), // JSON string[]
  situationTags: text("situation_tags").notNull().default("[]"), // JSON string[]
  linkedEntryId: text("linked_entry_id"), // optional connection to a prior moment
  entryDate: bigint("entry_date", { mode: "number" }).notNull(), // when it happened (user-set, can differ from createdAt)
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const traitRatings = pgTable("trait_ratings", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  relationshipId: text("relationship_id").notNull(),
  traitKey: text("trait_key").notNull(),
  value: integer("value").notNull(), // 1-10, user-set, editable, tentative
  note: text("note"), // optional: why they rated it this way, traceable to entries
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const customTags = pgTable("custom_tags", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  label: text("label").notNull(),
  category: text("category").notNull(), // "emotion" | "situation"
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// Per-user row for small app-level flags (e.g. has onboarding been
// completed). Kept separate from user-authored content. One row per user,
// keyed by userId instead of a fixed "singleton" id now that the app is
// multi-user.
export const appSettings = pgTable("app_settings", {
  userId: uuid("user_id").primaryKey(),
  onboarded: boolean("onboarded").notNull().default(false),
  theme: text("theme").notNull().default("system"), // "light" | "dark" | "system"
});

// A check-in is a snapshot in time: every trait rating (healthy + pattern),
// captured together with an optional note, so later a person can see how
// their own ratings moved across check-ins. No score, risk level, or
// verdict is stored or computed here -- only the raw ratings + note, which
// stay traceable and editable, never presented as fact.
export const checkIns = pgTable("check_ins", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  relationshipId: text("relationship_id").notNull(),
  ratings: text("ratings").notNull(), // JSON: Record<traitKey, 1-10>
  note: text("note"), // optional: what prompted this check-in
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const preferences = pgTable("preferences", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  relationshipId: text("relationship_id").notNull(),
  kind: text("kind").notNull(), // PreferenceKind
  category: text("category").notNull().default("other"),
  text: text("text").notNull(), // what they like / dislike, in the user's words
  note: text("note"), // optional: how I learned this ("they told me", "noticed on our 2nd date")
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ---------------------------------------------------------------------------
// Insert schemas + types
// ---------------------------------------------------------------------------

export const insertRelationshipSchema = createInsertSchema(relationships).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertRelationship = z.infer<typeof insertRelationshipSchema>;
export type Relationship = typeof relationships.$inferSelect;

export const insertEntrySchema = createInsertSchema(entries)
  .omit({ id: true, userId: true, createdAt: true })
  .extend({
    emotionTags: z.array(z.string()).default([]),
    situationTags: z.array(z.string()).default([]),
  });
export type InsertEntry = z.infer<typeof insertEntrySchema>;
export type Entry = typeof entries.$inferSelect;

export const insertTraitRatingSchema = createInsertSchema(traitRatings).omit({
  id: true,
  userId: true,
  updatedAt: true,
});
export type InsertTraitRating = z.infer<typeof insertTraitRatingSchema>;
export type TraitRating = typeof traitRatings.$inferSelect;

export const insertCustomTagSchema = createInsertSchema(customTags).omit({
  id: true,
  userId: true,
  createdAt: true,
});
export type InsertCustomTag = z.infer<typeof insertCustomTagSchema>;
export type CustomTag = typeof customTags.$inferSelect;

export const insertCheckInSchema = createInsertSchema(checkIns)
  .omit({ id: true, userId: true, createdAt: true })
  .extend({
    ratings: z.record(z.string(), z.number().int().min(1).max(10)),
  });
export type InsertCheckIn = z.infer<typeof insertCheckInSchema>;
export type CheckIn = typeof checkIns.$inferSelect;

export const insertPreferenceSchema = z.object({
  relationshipId: z.string().min(1),
  kind: z.enum(PREFERENCE_KINDS),
  category: z.enum(PREFERENCE_CATEGORIES.map((c) => c.key) as [string, ...string[]]).default("other"),
  text: z.string().trim().min(1, "Add a few words").max(200),
  note: z.string().trim().max(500).nullable().optional(),
});
export type InsertPreference = z.infer<typeof insertPreferenceSchema>;
export type Preference = typeof preferences.$inferSelect;

// ---------------------------------------------------------------------------
// Pattern summary -- a neutral, tentative surfacing of which pattern
// categories show up more in a check-in's ratings. This intentionally does
// NOT compute a risk score, health score, or verdict, and never recommends
// staying or leaving. It only reflects the numbers the user themselves
// entered, back to them, grouped by category, so they can notice trends in
// their own words over time.
// ---------------------------------------------------------------------------
export type CategorySummary = {
  categoryKey: string;
  categoryLabel: string;
  average: number; // 1-10, average of that category's traits in this check-in
  elevatedTraits: { key: string; label: string; value: number }[]; // traits rated 7+
};

export function summarizeHealthyCategories(ratings: Record<string, number>): CategorySummary[] {
  return HEALTHY_CATEGORIES.map((cat) => {
    const vals = cat.traits.map((t) => ratings[t.key] ?? 5);
    const average = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    return {
      categoryKey: cat.key,
      categoryLabel: cat.label,
      average,
      elevatedTraits: [],
    };
  });
}

export function summarizePatternCategories(ratings: Record<string, number>): CategorySummary[] {
  return PATTERN_CATEGORIES.map((cat) => {
    const vals = cat.traits.map((t) => ratings[t.key] ?? 1);
    const average = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    const elevatedTraits = cat.traits
      .filter((t) => (ratings[t.key] ?? 1) >= 7)
      .map((t) => ({ key: t.key, label: t.label, value: ratings[t.key] ?? 1 }));
    return {
      categoryKey: cat.key,
      categoryLabel: cat.label,
      average,
      elevatedTraits,
    };
  });
}

// Plain, tentative, non-directive phrasing for a pattern category's
// current average -- never advice, never a verdict.
export function describeCategoryLevel(average: number): string {
  if (average >= 7) return "showing up often in what I've logged";
  if (average >= 4) return "showing up sometimes in what I've logged";
  return "showing up rarely in what I've logged";
}
