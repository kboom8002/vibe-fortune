-- 0004_rls_update_delete.sql
-- Add UPDATE and DELETE policies for user-owned tables

create policy "manse_charts_update_own" on manse_charts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "manse_charts_delete_own" on manse_charts for delete using (auth.uid() = user_id);

create policy "major_luck_cycles_update_own" on major_luck_cycles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "major_luck_cycles_delete_own" on major_luck_cycles for delete using (auth.uid() = user_id);

create policy "vibe_checkins_update_own" on vibe_checkins for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "vibe_checkins_delete_own" on vibe_checkins for delete using (auth.uid() = user_id);

create policy "forecast_requests_update_own" on forecast_requests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "forecast_requests_delete_own" on forecast_requests for delete using (auth.uid() = user_id);

create policy "context_tensors_update_own" on context_tensors for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "context_tensors_delete_own" on context_tensors for delete using (auth.uid() = user_id);

create policy "concept_states_update_own" on concept_states for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "concept_states_delete_own" on concept_states for delete using (auth.uid() = user_id);

create policy "risk_vectors_update_own" on risk_vectors for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "risk_vectors_delete_own" on risk_vectors for delete using (auth.uid() = user_id);

create policy "action_policies_update_own" on action_policies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "action_policies_delete_own" on action_policies for delete using (auth.uid() = user_id);

create policy "forecast_outputs_update_own" on forecast_outputs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "forecast_outputs_delete_own" on forecast_outputs for delete using (auth.uid() = user_id);

create policy "run_receipts_delete_own" on run_receipts for delete using (auth.uid() = user_id);

create policy "safety_events_update_own" on safety_events for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "safety_events_delete_own" on safety_events for delete using (auth.uid() = user_id);
