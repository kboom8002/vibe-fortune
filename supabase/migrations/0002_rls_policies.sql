-- 0002_rls_policies.sql
-- TCO-Vibe Fortune Coach v2 RLS sample policies

alter table profiles enable row level security;
alter table birth_profiles enable row level security;
alter table manse_charts enable row level security;
alter table major_luck_cycles enable row level security;
alter table vibe_checkins enable row level security;
alter table forecast_requests enable row level security;
alter table context_tensors enable row level security;
alter table concept_states enable row level security;
alter table risk_vectors enable row level security;
alter table action_policies enable row level security;
alter table forecast_outputs enable row level security;
alter table run_receipts enable row level security;
alter table safety_events enable row level security;

-- Helper pattern: user-owned tables
create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "birth_profiles_select_own" on birth_profiles for select using (auth.uid() = user_id);
create policy "birth_profiles_insert_own" on birth_profiles for insert with check (auth.uid() = user_id);
create policy "birth_profiles_update_own" on birth_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "birth_profiles_delete_own" on birth_profiles for delete using (auth.uid() = user_id);

create policy "manse_charts_select_own" on manse_charts for select using (auth.uid() = user_id);
create policy "manse_charts_insert_own" on manse_charts for insert with check (auth.uid() = user_id);

create policy "major_luck_cycles_select_own" on major_luck_cycles for select using (auth.uid() = user_id);
create policy "major_luck_cycles_insert_own" on major_luck_cycles for insert with check (auth.uid() = user_id);

create policy "vibe_checkins_select_own" on vibe_checkins for select using (auth.uid() = user_id);
create policy "vibe_checkins_insert_own" on vibe_checkins for insert with check (auth.uid() = user_id);

create policy "forecast_requests_select_own" on forecast_requests for select using (auth.uid() = user_id);
create policy "forecast_requests_insert_own" on forecast_requests for insert with check (auth.uid() = user_id);

create policy "context_tensors_select_own" on context_tensors for select using (auth.uid() = user_id);
create policy "context_tensors_insert_own" on context_tensors for insert with check (auth.uid() = user_id);

create policy "concept_states_select_own" on concept_states for select using (auth.uid() = user_id);
create policy "concept_states_insert_own" on concept_states for insert with check (auth.uid() = user_id);

create policy "risk_vectors_select_own" on risk_vectors for select using (auth.uid() = user_id);
create policy "risk_vectors_insert_own" on risk_vectors for insert with check (auth.uid() = user_id);

create policy "action_policies_select_own" on action_policies for select using (auth.uid() = user_id);
create policy "action_policies_insert_own" on action_policies for insert with check (auth.uid() = user_id);

create policy "forecast_outputs_select_own" on forecast_outputs for select using (auth.uid() = user_id);
create policy "forecast_outputs_insert_own" on forecast_outputs for insert with check (auth.uid() = user_id);

create policy "run_receipts_select_own" on run_receipts for select using (auth.uid() = user_id);
create policy "run_receipts_insert_own" on run_receipts for insert with check (auth.uid() = user_id);
create policy "run_receipts_update_own" on run_receipts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "safety_events_select_own" on safety_events for select using (auth.uid() = user_id);
create policy "safety_events_insert_own" on safety_events for insert with check (auth.uid() = user_id or user_id is null);

-- Admin-managed tables: enable RLS and disallow direct mutation by normal users.
alter table concept_entities enable row level security;
alter table operator_rules enable row level security;
alter table goldset_items enable row level security;
alter table eval_results enable row level security;

create policy "concept_entities_read_approved" on concept_entities for select using (reviewer_status = 'approved');
create policy "operator_rules_read_enabled" on operator_rules for select using (enabled = true);
