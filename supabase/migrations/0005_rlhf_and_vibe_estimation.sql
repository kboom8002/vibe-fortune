-- 0005_rlhf_and_vibe_estimation.sql
-- Alter profiles to support RLHF tuning parameters and create the forecast_feedbacks table

alter table profiles 
add column if not exists rlhf_bias jsonb not null default '{"intensity_offset": 0, "risk_sensitivity": 1.0, "tone_preference": null, "action_count_limit": null}'::jsonb;

-- Create forecast_feedbacks table
create table if not exists forecast_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_output_id uuid not null references forecast_outputs(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  feedback_tags text[] not null default '{}'::text[],
  comment text,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table forecast_feedbacks enable row level security;

-- Create policies for forecast_feedbacks
create policy "forecast_feedbacks_select_own" on forecast_feedbacks 
  for select using (auth.uid() = user_id);

create policy "forecast_feedbacks_insert_own" on forecast_feedbacks 
  for insert with check (auth.uid() = user_id);

create policy "forecast_feedbacks_update_own" on forecast_feedbacks 
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "forecast_feedbacks_delete_own" on forecast_feedbacks 
  for delete using (auth.uid() = user_id);
