import {
  relationships,
  entries,
  traitRatings,
  customTags,
  appSettings,
  checkIns,
  preferences,
} from "@shared/schema";
import type {
  Relationship,
  InsertRelationship,
  Entry,
  InsertEntry,
  TraitRating,
  InsertTraitRating,
  CustomTag,
  InsertCustomTag,
  CheckIn,
  InsertCheckIn,
  Preference,
  InsertPreference,
  ThemeMode,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "node:crypto";

// Supabase's pooled connection (pgbouncer, transaction mode) does not
// support prepared statements, so disable them here.
//
// Built lazily (not at module load) so a missing DATABASE_URL on a
// serverless platform surfaces as a clean error from a route handler
// instead of crashing the whole function at import time.
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Add your Supabase Postgres connection string (Project Settings -> Database -> Connection string) to .env (locally) or your hosting platform's Environment Variables."
    );
  }
  const sql = postgres(process.env.DATABASE_URL, { prepare: false });
  return drizzle(sql);
}

let cachedDb: ReturnType<typeof drizzle> | undefined;
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!cachedDb) cachedDb = getDb();
    return (cachedDb as any)[prop];
  },
});

export interface IStorage {
  // Relationships
  listRelationships(userId: string): Promise<Relationship[]>;
  getRelationship(userId: string, id: string): Promise<Relationship | undefined>;
  createRelationship(userId: string, data: InsertRelationship): Promise<Relationship>;
  updateRelationship(userId: string, id: string, data: Partial<InsertRelationship>): Promise<Relationship | undefined>;
  deleteRelationship(userId: string, id: string): Promise<{ changes: number }>;

  // Entries
  listEntriesForRelationship(userId: string, relationshipId: string): Promise<Entry[]>;
  getEntry(userId: string, id: string): Promise<Entry | undefined>;
  createEntry(userId: string, data: InsertEntry): Promise<Entry>;
  updateEntry(userId: string, id: string, data: Partial<InsertEntry>): Promise<Entry | undefined>;
  deleteEntry(userId: string, id: string): Promise<{ changes: number }>;
  listAllEntries(userId: string): Promise<Entry[]>;

  // Trait ratings
  listTraitRatings(userId: string, relationshipId: string): Promise<TraitRating[]>;
  upsertTraitRating(userId: string, relationshipId: string, traitKey: string, value: number, note?: string): Promise<TraitRating>;

  // Custom tags
  listCustomTags(userId: string): Promise<CustomTag[]>;
  createCustomTag(userId: string, data: InsertCustomTag): Promise<CustomTag>;
  deleteCustomTag(userId: string, id: string): Promise<{ changes: number }>;

  // Check-ins (snapshots of all trait ratings at a point in time)
  listCheckIns(userId: string, relationshipId: string): Promise<CheckIn[]>;
  createCheckIn(userId: string, data: InsertCheckIn): Promise<CheckIn>;
  deleteCheckIn(userId: string, id: string): Promise<{ changes: number }>;

  // Likes & dislikes
  listPreferences(userId: string, relationshipId: string): Promise<Preference[]>;
  createPreference(userId: string, data: InsertPreference): Promise<Preference>;
  updatePreference(userId: string, id: string, data: Partial<Pick<InsertPreference, "text" | "note" | "category">>): Promise<Preference | undefined>;
  deletePreference(userId: string, id: string): Promise<{ changes: number }>;

  // Full data export / wipe (privacy controls)
  exportAll(userId: string): Promise<{
    relationships: Relationship[];
    entries: Entry[];
    traitRatings: TraitRating[];
    customTags: CustomTag[];
    checkIns: CheckIn[];
    preferences: Preference[];
  }>;
  deleteAllData(userId: string): Promise<void>;

  // App-level flags (per-user, not shared content)
  getOnboarded(userId: string): Promise<boolean>;
  setOnboarded(userId: string, value: boolean): Promise<void>;
  getTheme(userId: string): Promise<ThemeMode>;
  setTheme(userId: string, value: ThemeMode): Promise<void>;
}

function parseEntry(row: any): Entry {
  return row;
}

export class DatabaseStorage implements IStorage {
  async listRelationships(userId: string): Promise<Relationship[]> {
    return db
      .select()
      .from(relationships)
      .where(eq(relationships.userId, userId))
      .orderBy(desc(relationships.createdAt));
  }

  async getRelationship(userId: string, id: string): Promise<Relationship | undefined> {
    const rows = await db
      .select()
      .from(relationships)
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)));
    return rows[0];
  }

  async createRelationship(userId: string, data: InsertRelationship): Promise<Relationship> {
    const row = {
      id: randomUUID(),
      userId,
      label: data.label,
      type: data.type,
      note: data.note ?? null,
      archived: data.archived ?? false,
      createdAt: Date.now(),
    };
    const [created] = await db.insert(relationships).values(row).returning();
    return created;
  }

  async updateRelationship(userId: string, id: string, data: Partial<InsertRelationship>): Promise<Relationship | undefined> {
    const [updated] = await db
      .update(relationships)
      .set(data)
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))
      .returning();
    return updated;
  }

  async deleteRelationship(userId: string, id: string): Promise<{ changes: number }> {
    await db.delete(entries).where(and(eq(entries.relationshipId, id), eq(entries.userId, userId)));
    await db.delete(traitRatings).where(and(eq(traitRatings.relationshipId, id), eq(traitRatings.userId, userId)));
    await db.delete(checkIns).where(and(eq(checkIns.relationshipId, id), eq(checkIns.userId, userId)));
    await db.delete(preferences).where(and(eq(preferences.relationshipId, id), eq(preferences.userId, userId)));
    const result = await db
      .delete(relationships)
      .where(and(eq(relationships.id, id), eq(relationships.userId, userId)))
      .returning();
    return { changes: result.length };
  }

  async listEntriesForRelationship(userId: string, relationshipId: string): Promise<Entry[]> {
    const rows = await db
      .select()
      .from(entries)
      .where(and(eq(entries.relationshipId, relationshipId), eq(entries.userId, userId)))
      .orderBy(desc(entries.entryDate));
    return rows.map(parseEntry);
  }

  async listAllEntries(userId: string): Promise<Entry[]> {
    const rows = await db
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.entryDate));
    return rows.map(parseEntry);
  }

  async getEntry(userId: string, id: string): Promise<Entry | undefined> {
    const rows = await db
      .select()
      .from(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)));
    return rows[0] ? parseEntry(rows[0]) : undefined;
  }

  async createEntry(userId: string, data: InsertEntry): Promise<Entry> {
    const row = {
      id: randomUUID(),
      userId,
      relationshipId: data.relationshipId,
      title: data.title ?? null,
      whatHappened: data.whatHappened,
      feelings: data.feelings ?? null,
      bodyNotice: data.bodyNotice ?? null,
      needHope: data.needHope ?? null,
      whatFollowed: data.whatFollowed ?? null,
      remember: data.remember ?? null,
      emotionTags: JSON.stringify(data.emotionTags ?? []),
      situationTags: JSON.stringify(data.situationTags ?? []),
      linkedEntryId: data.linkedEntryId ?? null,
      entryDate: data.entryDate ?? Date.now(),
      createdAt: Date.now(),
    };
    const [created] = await db.insert(entries).values(row).returning();
    return parseEntry(created);
  }

  async updateEntry(userId: string, id: string, data: Partial<InsertEntry>): Promise<Entry | undefined> {
    const update: Record<string, any> = { ...data };
    if (data.emotionTags) update.emotionTags = JSON.stringify(data.emotionTags);
    if (data.situationTags) update.situationTags = JSON.stringify(data.situationTags);
    const [row] = await db
      .update(entries)
      .set(update)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning();
    return row ? parseEntry(row) : undefined;
  }

  async deleteEntry(userId: string, id: string): Promise<{ changes: number }> {
    const result = await db
      .delete(entries)
      .where(and(eq(entries.id, id), eq(entries.userId, userId)))
      .returning();
    return { changes: result.length };
  }

  async listTraitRatings(userId: string, relationshipId: string): Promise<TraitRating[]> {
    return db
      .select()
      .from(traitRatings)
      .where(and(eq(traitRatings.relationshipId, relationshipId), eq(traitRatings.userId, userId)));
  }

  async upsertTraitRating(userId: string, relationshipId: string, traitKey: string, value: number, note?: string): Promise<TraitRating> {
    const existingRows = await db
      .select()
      .from(traitRatings)
      .where(and(eq(traitRatings.relationshipId, relationshipId), eq(traitRatings.userId, userId)));
    const existing = existingRows.find((r) => r.traitKey === traitKey);

    if (existing) {
      const [updated] = await db
        .update(traitRatings)
        .set({ value, note: note ?? existing.note, updatedAt: Date.now() })
        .where(and(eq(traitRatings.id, existing.id), eq(traitRatings.userId, userId)))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(traitRatings)
      .values({
        id: randomUUID(),
        userId,
        relationshipId,
        traitKey,
        value,
        note: note ?? null,
        updatedAt: Date.now(),
      })
      .returning();
    return created;
  }

  async listCustomTags(userId: string): Promise<CustomTag[]> {
    return db.select().from(customTags).where(eq(customTags.userId, userId));
  }

  async createCustomTag(userId: string, data: InsertCustomTag): Promise<CustomTag> {
    const [created] = await db
      .insert(customTags)
      .values({ id: randomUUID(), userId, label: data.label, category: data.category, createdAt: Date.now() })
      .returning();
    return created;
  }

  async deleteCustomTag(userId: string, id: string): Promise<{ changes: number }> {
    const result = await db
      .delete(customTags)
      .where(and(eq(customTags.id, id), eq(customTags.userId, userId)))
      .returning();
    return { changes: result.length };
  }

  async listCheckIns(userId: string, relationshipId: string): Promise<CheckIn[]> {
    return db
      .select()
      .from(checkIns)
      .where(and(eq(checkIns.relationshipId, relationshipId), eq(checkIns.userId, userId)))
      .orderBy(desc(checkIns.createdAt));
  }

  async createCheckIn(userId: string, data: InsertCheckIn): Promise<CheckIn> {
    const row = {
      id: randomUUID(),
      userId,
      relationshipId: data.relationshipId,
      ratings: JSON.stringify(data.ratings),
      note: data.note ?? null,
      createdAt: Date.now(),
    };
    const [created] = await db.insert(checkIns).values(row).returning();
    return created;
  }

  async deleteCheckIn(userId: string, id: string): Promise<{ changes: number }> {
    const result = await db
      .delete(checkIns)
      .where(and(eq(checkIns.id, id), eq(checkIns.userId, userId)))
      .returning();
    return { changes: result.length };
  }

  async listPreferences(userId: string, relationshipId: string): Promise<Preference[]> {
    return db
      .select()
      .from(preferences)
      .where(and(eq(preferences.relationshipId, relationshipId), eq(preferences.userId, userId)))
      .orderBy(desc(preferences.createdAt));
  }

  async createPreference(userId: string, data: InsertPreference): Promise<Preference> {
    // Only attach to a relationship this user actually owns.
    const rel = await this.getRelationship(userId, data.relationshipId);
    if (!rel) throw new Error("Relationship not found");
    const row = {
      id: randomUUID(),
      userId,
      relationshipId: data.relationshipId,
      kind: data.kind,
      category: data.category,
      text: data.text,
      note: data.note ?? null,
      createdAt: Date.now(),
    };
    const [created] = await db.insert(preferences).values(row).returning();
    return created;
  }

  async updatePreference(userId: string, id: string, data: Partial<Pick<InsertPreference, "text" | "note" | "category">>): Promise<Preference | undefined> {
    const [updated] = await db
      .update(preferences)
      .set(data)
      .where(and(eq(preferences.id, id), eq(preferences.userId, userId)))
      .returning();
    return updated;
  }

  async deletePreference(userId: string, id: string): Promise<{ changes: number }> {
    const result = await db
      .delete(preferences)
      .where(and(eq(preferences.id, id), eq(preferences.userId, userId)))
      .returning();
    return { changes: result.length };
  }

  async exportAll(userId: string) {
    return {
      relationships: await this.listRelationships(userId),
      entries: await this.listAllEntries(userId),
      traitRatings: await db.select().from(traitRatings).where(eq(traitRatings.userId, userId)),
      customTags: await this.listCustomTags(userId),
      checkIns: await db.select().from(checkIns).where(eq(checkIns.userId, userId)),
      preferences: await db.select().from(preferences).where(eq(preferences.userId, userId)),
    };
  }

  async deleteAllData(userId: string): Promise<void> {
    await db.delete(entries).where(eq(entries.userId, userId));
    await db.delete(traitRatings).where(eq(traitRatings.userId, userId));
    await db.delete(checkIns).where(eq(checkIns.userId, userId));
    await db.delete(preferences).where(eq(preferences.userId, userId));
    await db.delete(relationships).where(eq(relationships.userId, userId));
    await db.delete(customTags).where(eq(customTags.userId, userId));
  }

  async getOnboarded(userId: string): Promise<boolean> {
    const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    return Boolean(rows[0]?.onboarded);
  }

  async setOnboarded(userId: string, value: boolean): Promise<void> {
    const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    if (rows[0]) {
      await db.update(appSettings).set({ onboarded: value }).where(eq(appSettings.userId, userId));
    } else {
      await db.insert(appSettings).values({ userId, onboarded: value });
    }
  }

  async getTheme(userId: string): Promise<ThemeMode> {
    const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    return (rows[0]?.theme as ThemeMode) ?? "system";
  }

  async setTheme(userId: string, value: ThemeMode): Promise<void> {
    const rows = await db.select().from(appSettings).where(eq(appSettings.userId, userId));
    if (rows[0]) {
      await db.update(appSettings).set({ theme: value }).where(eq(appSettings.userId, userId));
    } else {
      await db.insert(appSettings).values({ userId, theme: value });
    }
  }
}

export const storage = new DatabaseStorage();
