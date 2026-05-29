-- 0001_initial_schema.sql
-- TCO-Vibe Fortune Coach v2 initial schema sample

create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  default_timezone text not null default 'Asia/Seoul',
  preferred_language text not null default 'ko',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists birth_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_datetime timestamptz not null,
  timezone text not null default 'Asia/Seoul',
  gender text not null default 'unspecified',
  birth_location text,
  provided_chart jsonb,
  calculation_policy jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists manse_charts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_profile_id uuid not null references birth_profiles(id) on delete cascade,
  pillars jsonb not null,
  day_master jsonb not null,
  ten_gods jsonb not null default '{}'::jsonb,
  hidden_stems jsonb not null default '{}'::jsonb,
  five_element_distribution jsonb not null,
  chart_consistency jsonb,
  calculation_policy jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists major_luck_cycles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  birth_profile_id uuid not null references birth_profiles(id) on delete cascade,
  chart_id uuid references manse_charts(id) on delete set null,
  direction text not null,
  start_age numeric,
  start_date date,
  cycles jsonb not null default '[]'::jsonb,
  calculation_policy jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists vibe_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  valence numeric not null check (valence >= 0 and valence <= 10),
  arousal numeric not null check (arousal >= 0 and arousal <= 10),
  energy numeric not null check (energy >= 0 and energy <= 10),
  focus numeric not null check (focus >= 0 and focus <= 10),
  social_load numeric not null check (social_load >= 0 and social_load <= 10),
  sleep_hours numeric check (sleep_hours >= 0 and sleep_hours <= 24),
  one_line_event text,
  created_at timestamptz not null default now()
);

create table if not exists forecast_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  target_date date,
  date_range jsonb,
  current_focus jsonb not null default '[]'::jsonb,
  user_message text,
  birth_profile_id uuid references birth_profiles(id) on delete set null,
  vibe_checkin_id uuid references vibe_checkins(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists context_tensors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists concept_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  payload jsonb not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
);

create table if not exists risk_vectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  payload jsonb not null,
  primary_risk text not null,
  created_at timestamptz not null default now()
);

create table if not exists action_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  mode text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists forecast_outputs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  mode text not null,
  output_json jsonb not null,
  output_markdown text not null,
  grade text,
  context_tensor_id uuid references context_tensors(id) on delete set null,
  concept_state_id uuid references concept_states(id) on delete set null,
  risk_vector_id uuid references risk_vectors(id) on delete set null,
  action_policy_id uuid references action_policies(id) on delete set null,
  safety_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists run_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_output_id uuid not null references forecast_outputs(id) on delete cascade,
  what_i_did text not null,
  why_i_chose_it text,
  what_ai_helped text,
  my_judgment text,
  what_i_deferred text,
  what_i_learned text,
  next_action text,
  created_at timestamptz not null default now()
);

create table if not exists safety_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  forecast_request_id uuid references forecast_requests(id) on delete set null,
  event_type text not null,
  severity text not null,
  input_excerpt text,
  action_taken text not null,
  created_at timestamptz not null default now()
);

create table if not exists concept_entities (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null unique,
  preferred_label text not null,
  aliases jsonb not null default '[]'::jsonb,
  concept_type text not null,
  domain jsonb not null default '[]'::jsonb,
  vectors jsonb,
  region jsonb,
  operators jsonb,
  evidence_sources jsonb,
  reviewer_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists operator_rules (
  id uuid primary key default gen_random_uuid(),
  operator_id text not null unique,
  name text not null,
  trigger jsonb not null,
  output_policy jsonb not null,
  priority integer not null default 100,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists goldset_items (
  id uuid primary key default gen_random_uuid(),
  input jsonb not null,
  required_concepts jsonb not null default '[]'::jsonb,
  forbidden_concepts jsonb not null default '[]'::jsonb,
  expected_action_policy jsonb not null default '[]'::jsonb,
  safety_requirements jsonb not null default '[]'::jsonb,
  reviewer_notes text,
  created_at timestamptz not null default now()
);

create table if not exists eval_results (
  id uuid primary key default gen_random_uuid(),
  forecast_output_id uuid references forecast_outputs(id) on delete cascade,
  template_completeness numeric,
  concept_coverage numeric,
  risk_alignment numeric,
  action_policy_correctness numeric,
  boundary_compliance numeric,
  hallucinated_concept_rate numeric,
  notes text,
  created_at timestamptz not null default now()
);
