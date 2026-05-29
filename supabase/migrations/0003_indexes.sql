-- 0003_indexes.sql
-- TCO-Vibe Fortune Coach v2 indexes

create index if not exists idx_birth_profiles_user_id on birth_profiles(user_id);
create index if not exists idx_manse_charts_user_birth on manse_charts(user_id, birth_profile_id);
create index if not exists idx_vibe_checkins_user_created on vibe_checkins(user_id, created_at desc);
create index if not exists idx_forecast_requests_user_created on forecast_requests(user_id, created_at desc);
create index if not exists idx_forecast_outputs_user_created on forecast_outputs(user_id, created_at desc);
create index if not exists idx_run_receipts_user_created on run_receipts(user_id, created_at desc);
create index if not exists idx_safety_events_user_created on safety_events(user_id, created_at desc);
create index if not exists idx_operator_rules_enabled_priority on operator_rules(enabled, priority);
create index if not exists idx_concept_entities_concept_id on concept_entities(concept_id);
