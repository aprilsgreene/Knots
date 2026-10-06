-- Knots: initial Supabase (Postgres) schema + Row Level Security setup.
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / DROP POLICY IF EXISTS.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists relationships (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  type text not null,
  note text,
  archived boolean not null default false,
  created_at bigint not null
);

create table if not exists entries (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id text not null,
  title text,
  what_happened text not null,
  feelings text,
  body_notice text,
  need_hope text,
  what_followed text,
  remember text,
  emotion_tags text not null default '[]',
  situation_tags text not null default '[]',
  linked_entry_id text,
  entry_date bigint not null,
  created_at bigint not null
);

create table if not exists trait_ratings (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id text not null,
  trait_key text not null,
  value integer not null,
  note text,
  updated_at bigint not null
);

create table if not exists custom_tags (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  category text not null,
  created_at bigint not null
);

create table if not exists app_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  onboarded boolean not null default false,
  theme text not null default 'system'
);

create table if not exists check_ins (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id text not null,
  ratings text not null,
  note text,
  created_at bigint not null
);

-- Helpful indexes for the queries the app actually runs.
create index if not exists idx_relationships_user on relationships(user_id);
create index if not exists idx_entries_user on entries(user_id);
create index if not exists idx_entries_relationship on entries(relationship_id);
create index if not exists idx_trait_ratings_user on trait_ratings(user_id);
create index if not exists idx_trait_ratings_relationship on trait_ratings(relationship_id);
create index if not exists idx_custom_tags_user on custom_tags(user_id);
create index if not exists idx_check_ins_user on check_ins(user_id);
create index if not exists idx_check_ins_relationship on check_ins(relationship_id);

-- ---------------------------------------------------------------------------
-- Row Level Security -- every table is scoped strictly to auth.uid().
-- The app's own server also filters every query by user_id (belt and
-- suspenders), but RLS is what actually enforces this at the database
-- level even if the server code ever had a bug.
-- ---------------------------------------------------------------------------

alter table relationships enable row level security;
alter table entries enable row level security;
alter table trait_ratings enable row level security;
alter table custom_tags enable row level security;
alter table app_settings enable row level security;
alter table check_ins enable row level security;

drop policy if exists "Users manage their own relationships" on relationships;
create policy "Users manage their own relationships" on relationships
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own entries" on entries;
create policy "Users manage their own entries" on entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own trait ratings" on trait_ratings;
create policy "Users manage their own trait ratings" on trait_ratings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own custom tags" on custom_tags;
create policy "Users manage their own custom tags" on custom_tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own app settings" on app_settings;
create policy "Users manage their own app settings" on app_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own check-ins" on check_ins;
create policy "Users manage their own check-ins" on check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
