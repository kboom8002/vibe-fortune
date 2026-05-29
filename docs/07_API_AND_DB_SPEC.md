# 07_API_AND_DB_SPEC.md
# API and Database Specification

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

This document defines the Supabase data model and Next.js API/server action contracts.

All tables containing user data must include `user_id` and enforce RLS.

---

## 2. Database Table Overview

User-owned tables:

```text
profiles
birth_profiles
manse_charts
major_luck_cycles
vibe_checkins
forecast_requests
context_tensors
concept_states
risk_vectors
action_policies
forecast_outputs
run_receipts
safety_events
```

Admin-managed tables:

```text
concept_entities
operator_rules
goldset_items
eval_results
```

---

## 3. Core Table Contracts

### 3.1 profiles

```sql
profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  default_timezone text not null default 'Asia/Seoul',
  preferred_language text not null default 'ko',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
)
```

### 3.2 birth_profiles

```sql
birth_profiles (
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
)
```

### 3.3 manse_charts

```sql
manse_charts (
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
)
```

### 3.4 major_luck_cycles

```sql
major_luck_cycles (
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
)
```

### 3.5 vibe_checkins

```sql
vibe_checkins (
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
)
```

### 3.6 forecast_requests

```sql
forecast_requests (
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
)
```

### 3.7 context_tensors

```sql
context_tensors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
)
```

### 3.8 concept_states

```sql
concept_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  payload jsonb not null,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now()
)
```

### 3.9 risk_vectors

```sql
risk_vectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  payload jsonb not null,
  primary_risk text not null,
  created_at timestamptz not null default now()
)
```

### 3.10 action_policies

```sql
action_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  forecast_request_id uuid not null references forecast_requests(id) on delete cascade,
  mode text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
)
```

### 3.11 forecast_outputs

```sql
forecast_outputs (
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
)
```

### 3.12 run_receipts

```sql
run_receipts (
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
)
```

---

## 4. API Routes / Server Actions

Recommended route pattern:

```text
POST /api/profile/birth
POST /api/vibe-checkin
POST /api/forecast/daily
POST /api/forecast/weekly
POST /api/forecast/monthly
POST /api/run-receipt
GET  /api/history
GET  /api/forecast/:id
```

---

## 5. Endpoint Contracts

### POST /api/profile/birth

Purpose: Create or update birth profile and calculate chart.

Request:

```ts
{
  name: string
  birthDateTime: string
  timezone: string
  gender: "male" | "female" | "other" | "unspecified"
  birthLocation?: string
  providedChart?: ProvidedChart
}
```

Response:

```ts
{
  birthProfile: BirthProfile
  chart: ChartResult
  majorLuck: MajorLuckResult
  warnings: AgentWarning[]
}
```

### POST /api/vibe-checkin

Purpose: Save current Vibe state.

Request:

```ts
{
  valence: number
  arousal: number
  energy: number
  focus: number
  socialLoad: number
  sleepHours?: number
  oneLineEvent?: string
}
```

Response:

```ts
{
  vibeCheckIn: VibeCheckIn
}
```

### POST /api/forecast/daily

Purpose: Generate daily operating board.

Request:

```ts
{
  birthProfileId?: string
  targetDate: string
  vibeCheckInId?: string
  vibeCheckIn?: VibeCheckInInput
  currentFocus: DomainAxis[]
  userMessage?: string
}
```

Response:

```ts
{
  status: "ok" | "blocked" | "onboarding_required" | "partial"
  forecastOutput?: DailyForecastOutput
  warnings: AgentWarning[]
  safetyFlags: SafetyFlag[]
}
```

### POST /api/run-receipt

Purpose: Save user's execution receipt after forecast.

Request:

```ts
{
  forecastOutputId: string
  whatIDid: string
  whyIChoseIt?: string
  whatAIHelped?: string
  myJudgment?: string
  whatIDeferred?: string
  whatILearned?: string
  nextAction?: string
}
```

Response:

```ts
{
  runReceipt: RunReceipt
}
```

---

## 6. API Validation Rules

- Validate request with Zod before any DB write.
- Validate LLM outputs before persistence.
- Reject unauthenticated requests.
- Use server-side Supabase client.
- Do not expose raw internal prompt or hidden reasoning.

---

## 7. Indexing

Recommended indexes:

```sql
create index idx_birth_profiles_user_id on birth_profiles(user_id);
create index idx_forecast_outputs_user_id_created_at on forecast_outputs(user_id, created_at desc);
create index idx_run_receipts_user_id_created_at on run_receipts(user_id, created_at desc);
create index idx_vibe_checkins_user_id_created_at on vibe_checkins(user_id, created_at desc);
create index idx_safety_events_user_id_created_at on safety_events(user_id, created_at desc);
```

---

## 8. Definition of Done

- All user-owned tables have `user_id`.
- All request/response contracts have Zod schemas.
- RLS policies are applied.
- Daily forecast API runs end-to-end with mock provider.
- Forecast output and run receipt are persisted.
