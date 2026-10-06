import type { TraitCategoryDef, TraitDef } from "@shared/schema";

/**
 * Per-field "dirty tracking" for check-ins.
 *
 * Every slider shows a starting value so it has somewhere to sit, but that
 * starting value is NOT an answer. A field only counts once the person moves
 * it (or taps the slider on purpose). Untouched fields are marked
 * isTouched: false and are left out of what gets saved, so a default can
 * never leak into a chart or trend line.
 */
export type FieldState = {
  /** What the slider currently shows. Starts at last time's rating, or the neutral default. */
  value: number;
  /** true only after the person actively interacted with this field. */
  isTouched: boolean;
};

export type FieldMap = Record<string, FieldState>;

/** Neutral starting positions: middle for "healthy" dimensions, bottom for pattern observations. */
export const HEALTHY_DEFAULT = 5;
export const PATTERN_DEFAULT = 1;

export function defaultFor(categoryKey: string, patternKeys: Set<string>): number {
  return patternKeys.has(categoryKey) ? PATTERN_DEFAULT : HEALTHY_DEFAULT;
}

/** Build a fresh map: every trait starts untouched, seeded from last time for display only. */
export function initFields(
  categories: { def: TraitCategoryDef; defaultValue: number }[],
  previous: Record<string, number>
): FieldMap {
  const map: FieldMap = {};
  for (const { def, defaultValue } of categories) {
    for (const t of def.traits) {
      map[t.key] = { value: previous[t.key] ?? defaultValue, isTouched: false };
    }
  }
  return map;
}

/** Mark a field as touched, optionally with a new value. Pure: returns a new map. */
export function touchField(map: FieldMap, key: string, value?: number): FieldMap {
  const current = map[key];
  if (!current) return map;
  return { ...map, [key]: { value: value ?? current.value, isTouched: true } };
}

/** Put a field back to untouched (not part of this check-in). */
export function clearField(map: FieldMap, key: string, resetValue: number): FieldMap {
  if (!map[key]) return map;
  return { ...map, [key]: { value: resetValue, isTouched: false } };
}

/** The ONLY data that gets saved: traits the person actually touched. */
export function touchedRatings(map: FieldMap): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, f] of Object.entries(map)) {
    if (f.isTouched) out[key] = f.value;
  }
  return out;
}

export function touchedCount(map: FieldMap, traits: TraitDef[]): number {
  return traits.filter((t) => map[t.key]?.isTouched).length;
}
