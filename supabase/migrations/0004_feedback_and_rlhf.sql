-- 0004_feedback_and_rlhf.sql
-- TCO-Vibe Fortune Coach v2: RLHF bias column, forecast_feedbacks table, and user delete RLS policies

-- 1. Add rlhf_bias column to profiles
alter table profiles
  add column if not exists rlhf_bias jsonb
  default '{"intensity_offset": 0, "risk_sensitivity": 1.0, "tone_preference": null, "action_count_limit": null}'::jsonb;

-- 2. Create forecast_feedbacks table
create table if not exists forecast_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_output_id uuid not null references forecast_outputs(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  feedback_tags jsonb not null default '[]'::jsonb,
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_forecast_feedbacks_user_id on forecast_feedbacks(user_id);
create index if not exists idx_forecast_feedbacks_forecast_output_id on forecast_feedbacks(forecast_output_id);

-- 3. Enable RLS and add policies for forecast_feedbacks
alter table forecast_feedbacks enable row level security;

create policy "forecast_feedbacks_select_own"
  on forecast_feedbacks for select
  using (auth.uid() = user_id);

create policy "forecast_feedbacks_insert_own"
  on forecast_feedbacks for insert
  with check (auth.uid() = user_id);

create policy "forecast_feedbacks_delete_own"
  on forecast_feedbacks for delete
  using (auth.uid() = user_id);

-- 4. Add delete RLS policies for user-owned tables that lacked delete policies in 0002_rls_policies.sql
create policy "profiles_delete_own"
  on profiles for delete
  using (auth.uid() = user_id);

create policy "manse_charts_delete_own"
  on manse_charts for delete
  using (auth.uid() = user_id);

create policy "major_luck_cycles_delete_own"
  on major_luck_cycles for delete
  using (auth.uid() = user_id);

create policy "vibe_checkins_delete_own"
  on vibe_checkins for delete
  using (auth.uid() = user_id);

create policy "forecast_requests_delete_own"
  on forecast_requests for delete
  using (auth.uid() = user_id);

create policy "context_tensors_delete_own"
  on context_tensors for delete
  using (auth.uid() = user_id);

create policy "concept_states_delete_own"
  on concept_states for delete
  using (auth.uid() = user_id);

create policy "risk_vectors_delete_own"
  on risk_vectors for delete
  using (auth.uid() = user_id);

create policy "action_policies_delete_own"
  on action_policies for delete
  using (auth.uid() = user_id);

create policy "forecast_outputs_delete_own"
  on forecast_outputs for delete
  using (auth.uid() = user_id);

create policy "run_receipts_delete_own"
  on run_receipts for delete
  using (auth.uid() = user_id);

create policy "safety_events_delete_own"
  on safety_events for delete
  using (auth.uid() = user_id);
