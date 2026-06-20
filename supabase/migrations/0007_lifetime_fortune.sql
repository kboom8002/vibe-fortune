-- 0007_lifetime_fortune.sql
-- Create lifetime_fortunes table for caching generated lifetime fortune analyses

create table if not exists lifetime_fortunes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_profile_id uuid not null references birth_profiles(id) on delete cascade,
  output_json jsonb not null,
  output_markdown text not null,
  annual_luck_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, birth_profile_id)
);

alter table lifetime_fortunes enable row level security;

create policy "lifetime_fortunes_select_own" on lifetime_fortunes
  for select using (auth.uid() = user_id);

create policy "lifetime_fortunes_insert_own" on lifetime_fortunes
  for insert with check (auth.uid() = user_id);

create policy "lifetime_fortunes_update_own" on lifetime_fortunes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lifetime_fortunes_delete_own" on lifetime_fortunes
  for delete using (auth.uid() = user_id);

create index if not exists idx_lifetime_fortunes_user_id on lifetime_fortunes(user_id);
