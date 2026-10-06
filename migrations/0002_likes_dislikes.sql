-- Knots: Likes & Dislikes ("getting to know them") for a relationship.
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS / DROP POLICY IF EXISTS.

create table if not exists preferences (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  relationship_id text not null,
  kind text not null check (kind in ('like', 'dislike')),
  category text not null default 'other',
  text text not null,
  note text,
  created_at bigint not null
);

create index if not exists idx_preferences_user on preferences(user_id);
create index if not exists idx_preferences_relationship on preferences(relationship_id);

alter table preferences enable row level security;

drop policy if exists "Users manage their own preferences" on preferences;
create policy "Users manage their own preferences" on preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
