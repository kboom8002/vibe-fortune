# 07A_SUPABASE_RLS_POLICY.md
# Supabase RLS Policy Specification

Version: 0.2  
Status: Implementation Contract

---

## 1. Purpose

This document defines Row Level Security rules for TCO-Vibe Fortune Coach.

Birth data, Vibe check-ins, forecast outputs, and run receipts are sensitive user-owned data. They must never be readable or writable across users.

---

## 2. Global RLS Rule

Every user-owned table must enforce:

```sql
using (auth.uid() = user_id)
with check (auth.uid() = user_id)
```

---

## 3. User-Owned Tables

Apply RLS to:

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

---

## 4. Admin-Managed Tables

Admin-managed tables are read-only for normal authenticated users unless explicitly exposed.

```text
concept_entities
operator_rules
goldset_items
eval_results
```

MVP policy:

- Authenticated users can read approved `concept_entities` and enabled `operator_rules` only through server-side APIs.
- Users cannot write admin tables.

---

## 5. Example Policies

### profiles

```sql
alter table profiles enable row level security;

create policy "profiles_select_own"
on profiles
for select
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on profiles
for insert
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### birth_profiles

```sql
alter table birth_profiles enable row level security;

create policy "birth_profiles_select_own"
on birth_profiles
for select
using (auth.uid() = user_id);

create policy "birth_profiles_insert_own"
on birth_profiles
for insert
with check (auth.uid() = user_id);

create policy "birth_profiles_update_own"
on birth_profiles
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "birth_profiles_delete_own"
on birth_profiles
for delete
using (auth.uid() = user_id);
```

### forecast_outputs

```sql
alter table forecast_outputs enable row level security;

create policy "forecast_outputs_select_own"
on forecast_outputs
for select
using (auth.uid() = user_id);

create policy "forecast_outputs_insert_own"
on forecast_outputs
for insert
with check (auth.uid() = user_id);
```

### run_receipts

```sql
alter table run_receipts enable row level security;

create policy "run_receipts_select_own"
on run_receipts
for select
using (auth.uid() = user_id);

create policy "run_receipts_insert_own"
on run_receipts
for insert
with check (auth.uid() = user_id);

create policy "run_receipts_update_own"
on run_receipts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

---

## 6. Service Role Rule

Server-side operations may use service role only for:

```text
admin seeding
background eval jobs
maintenance migrations
```

Forbidden:

```text
Using service role in browser
Returning service role keys to client
Bypassing RLS in user-facing API without explicit reason
```

---

## 7. Sensitive Data Minimization

Birth data and Vibe data are sensitive. Do not store unnecessary raw text.

Rules:

- Store user message only if required for forecast history.
- For critical safety events, store minimized excerpt only.
- Do not store hidden model reasoning.
- Do not store raw OpenAI request/response unless debugging mode is explicitly enabled in development.

---

## 8. Acceptance Criteria

- A user cannot select another user's birth profile.
- A user cannot update another user's forecast output.
- Unauthenticated requests are rejected.
- Admin tables cannot be mutated by normal users.
- RLS tests exist for at least birth_profiles, forecast_outputs, run_receipts.
