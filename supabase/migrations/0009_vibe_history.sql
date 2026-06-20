create table if not exists vibe_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  energy numeric(3,1) not null,
  valence numeric(3,1) not null,
  arousal numeric(3,1) not null,
  focus numeric(3,1) not null,
  social_load numeric(3,1) not null,
  note text,
  created_at timestamptz not null default now()
);
alter table vibe_history enable row level security;
create policy "vh_select_own" on vibe_history for select using (auth.uid() = user_id);
create policy "vh_insert_own" on vibe_history for insert with check (auth.uid() = user_id);
create index if not exists idx_vh_user_date on vibe_history(user_id, created_at desc);
