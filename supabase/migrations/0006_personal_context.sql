-- 0006_personal_context.sql
-- Add personal_context column to profiles for rich personal context storage

alter table profiles
add column if not exists personal_context jsonb not null default '{}'::jsonb;

-- RLS: personal_context follows the same access pattern as profile
-- (existing RLS policies on profiles already cover this column)
