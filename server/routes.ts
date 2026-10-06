import type { Express } from "express";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { storage } from "./storage";
import { requireAuth, getSupabaseAdmin } from "./auth";
import {
  insertRelationshipSchema,
  insertEntrySchema,
  insertCustomTagSchema,
  insertCheckInSchema,
  insertPreferenceSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Every /api route below requires a valid Supabase session. req.userId is
  // set by requireAuth and every storage call is scoped to it, so one
  // tester's data is never visible to another.
  app.use("/api", requireAuth);

  // ---- Relationships ----
  app.get("/api/relationships", async (req, res) => {
    const list = await storage.listRelationships(req.userId!);
    res.json(list);
  });

  app.get("/api/relationships/:id", async (req, res) => {
    const rel = await storage.getRelationship(req.userId!, req.params.id);
    if (!rel) return res.status(404).json({ message: "Not found" });
    res.json(rel);
  });

  app.post("/api/relationships", async (req, res) => {
    try {
      const data = insertRelationshipSchema.parse(req.body);
      const created = await storage.createRelationship(req.userId!, data);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.patch("/api/relationships/:id", async (req, res) => {
    try {
      const data = insertRelationshipSchema.partial().parse(req.body);
      const updated = await storage.updateRelationship(req.userId!, req.params.id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.delete("/api/relationships/:id", async (req, res) => {
    await storage.deleteRelationship(req.userId!, req.params.id);
    res.status(204).end();
  });

  // ---- Entries ----
  app.get("/api/entries", async (req, res) => {
    const relationshipId = req.query.relationshipId as string | undefined;
    if (relationshipId) {
      const list = await storage.listEntriesForRelationship(req.userId!, relationshipId);
      return res.json(list);
    }
    const list = await storage.listAllEntries(req.userId!);
    res.json(list);
  });

  app.get("/api/entries/:id", async (req, res) => {
    const entry = await storage.getEntry(req.userId!, req.params.id);
    if (!entry) return res.status(404).json({ message: "Not found" });
    res.json(entry);
  });

  app.post("/api/entries", async (req, res) => {
    try {
      const data = insertEntrySchema.parse(req.body);
      const created = await storage.createEntry(req.userId!, data);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.patch("/api/entries/:id", async (req, res) => {
    try {
      const data = insertEntrySchema.partial().parse(req.body);
      const updated = await storage.updateEntry(req.userId!, req.params.id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.delete("/api/entries/:id", async (req, res) => {
    await storage.deleteEntry(req.userId!, req.params.id);
    res.status(204).end();
  });

  // ---- Trait ratings ----
  app.get("/api/relationships/:id/traits", async (req, res) => {
    const list = await storage.listTraitRatings(req.userId!, req.params.id);
    res.json(list);
  });

  // ---- Check-ins (snapshot of all trait ratings + note, per relationship) ----
  app.get("/api/relationships/:id/checkins", async (req, res) => {
    const list = await storage.listCheckIns(req.userId!, req.params.id);
    res.json(list);
  });

  app.post("/api/relationships/:id/checkins", async (req, res) => {
    try {
      const data = insertCheckInSchema.parse({ ...req.body, relationshipId: req.params.id });
      const created = await storage.createCheckIn(req.userId!, data);
      // Keep "current" trait ratings in sync with the latest check-in. Only
      // traits the person actually rated are in `ratings` (the app drops
      // untouched defaults before sending), so nothing else is written.
      await Promise.all(
        Object.entries(data.ratings).map(([traitKey, value]) =>
          storage.upsertTraitRating(req.userId!, req.params.id, traitKey, value)
        )
      );
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.delete("/api/checkins/:id", async (req, res) => {
    await storage.deleteCheckIn(req.userId!, req.params.id);
    res.status(204).end();
  });

  // ---- Likes & dislikes ----
  app.get("/api/relationships/:id/preferences", async (req, res) => {
    const list = await storage.listPreferences(req.userId!, req.params.id);
    res.json(list);
  });

  app.post("/api/relationships/:id/preferences", async (req, res) => {
    try {
      const data = insertPreferenceSchema.parse({ ...req.body, relationshipId: req.params.id });
      const created = await storage.createPreference(req.userId!, data);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.patch("/api/preferences/:id", async (req, res) => {
    try {
      const data = insertPreferenceSchema
        .pick({ text: true, note: true, category: true })
        .partial()
        .parse(req.body);
      const updated = await storage.updatePreference(req.userId!, req.params.id, data);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.delete("/api/preferences/:id", async (req, res) => {
    await storage.deletePreference(req.userId!, req.params.id);
    res.status(204).end();
  });

  // ---- Custom tags ----
  app.get("/api/tags", async (req, res) => {
    const list = await storage.listCustomTags(req.userId!);
    res.json(list);
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const data = insertCustomTagSchema.parse(req.body);
      const created = await storage.createCustomTag(req.userId!, data);
      res.status(201).json(created);
    } catch (err) {
      res.status(400).json({ message: err instanceof Error ? err.message : "Invalid data" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    await storage.deleteCustomTag(req.userId!, req.params.id);
    res.status(204).end();
  });

  // ---- Privacy controls: export & delete everything ----
  app.get("/api/privacy/export", async (req, res) => {
    const data = await storage.exportAll(req.userId!);
    res.setHeader("Content-Disposition", "attachment; filename=kinlight-export.json");
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(data, null, 2));
  });

  // Full account deletion (App Store guideline 5.1.1(v) and Google Play's
  // account-deletion policy). Erases every row this person owns, then removes
  // their sign-in itself from Supabase Auth. Data goes first so that a failure
  // part-way leaves a signed-in user who can simply try again, never an
  // orphaned set of journal rows nobody can reach.
  app.delete("/api/account", async (req, res) => {
    try {
      await storage.deleteAccountData(req.userId!);
      const { error } = await getSupabaseAdmin().auth.admin.deleteUser(req.userId!);
      if (error) throw error;
      res.status(204).end();
    } catch (err) {
      console.error("Account deletion failed:", err instanceof Error ? err.message : err);
      res.status(500).json({ message: "We couldn't finish deleting your account. Please try again." });
    }
  });

  app.post("/api/privacy/delete-all", async (req, res) => {
    await storage.deleteAllData(req.userId!);
    res.status(204).end();
  });

  // ---- App-level settings (per-user flags, not shared content) ----
  app.get("/api/app-settings", async (req, res) => {
    const onboarded = await storage.getOnboarded(req.userId!);
    const theme = await storage.getTheme(req.userId!);
    res.json({ onboarded, theme });
  });

  app.post("/api/app-settings/onboarded", async (req, res) => {
    await storage.setOnboarded(req.userId!, true);
    res.status(204).end();
  });

  app.post("/api/app-settings/theme", async (req, res) => {
    const theme = req.body?.theme;
    if (theme !== "light" && theme !== "dark" && theme !== "system") {
      res.status(400).json({ message: "theme must be 'light', 'dark', or 'system'" });
      return;
    }
    await storage.setTheme(req.userId!, theme);
    res.status(204).end();
  });

  return httpServer;
}
