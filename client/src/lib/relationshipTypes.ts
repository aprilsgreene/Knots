// Re-export shared constants for convenience + add UI-only metadata (icons).
export {
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  HEALTHY_CATEGORIES,
  PATTERN_CATEGORIES,
  ALL_HEALTHY_TRAITS,
  ALL_PATTERN_TRAITS,
  ALL_TRAIT_DEFS,
  PREFERENCE_CATEGORIES,
  SUGGESTED_EMOTIONAL_TAGS,
  SUGGESTED_SITUATIONAL_TAGS,
  summarizeHealthyCategories,
  averageOfRated,
  summarizePatternCategories,
  describeCategoryLevel,
} from "@shared/schema";
export type { RelationshipType, TraitDef, TraitCategoryDef, CategorySummary, CheckIn } from "@shared/schema";

import type { RelationshipType } from "@shared/schema";

// Lucide icon names per relationship type (rendered via lucide-react in components)
export const RELATIONSHIP_TYPE_ICON: Record<RelationshipType, string> = {
  intimate: "Heart",
  sibling: "Users",
  parent_family: "Home",
  friend: "UserRound",
  coworker: "Briefcase",
  mentor_mentee: "Compass",
};

export const RELATIONSHIP_TYPE_BEST_FEATURE: Record<RelationshipType, string> = {
  intimate: "See whether a trigger tends to improve, worsen, or stay the same over time.",
  sibling: "Notice the role you tend to fall into — fixer, peacemaker, or something else.",
  parent_family: "A boundary tracker and a simple before/after visit check-in.",
  friend: "A support balance view — who tends to show up, and how often.",
  coworker: "Notes on boundaries, credit-sharing, and accountability over time.",
  mentor_mentee: "A growth timeline alongside the advice and feedback you've received.",
};
