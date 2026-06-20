-- 0008_forecast_history.sql
-- Forecast history table for storing all forecast results

create table if not exists forecast_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  scope text not null check (scope in ('daily', 'weekly', 'monthly', 'lifetime')),
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  rich_output_json jsonb,
  chart_snapshot_json jsonb,
  feedback_json jsonb,
  created_at timestamptz not null default now()
);

alter table forecast_history enable row level security;

create policy "fh_select_own" on forecast_history
  for select using (auth.uid() = user_id);

create policy "fh_insert_own" on forecast_history
  for insert with check (auth.uid() = user_id);

create policy "fh_update_own" on forecast_history
  for update using (auth.uid() = user_id);

create index if not exists idx_fh_user_scope_date
  on forecast_history(user_id, scope, created_at desc);
