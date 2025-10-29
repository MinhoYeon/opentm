-- Update trademark application status enum with new workflow stages
-- Adds: awaiting_acceleration, preparing_acceleration
-- This migration extends the trademark_application_status enum with priority examination stages

set check_function_bodies = off;

-- ============================================================================
-- Add new status values for priority examination workflow
-- ============================================================================

-- Add 'awaiting_acceleration' - waiting to apply for priority examination
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'awaiting_acceleration'
  ) then
    alter type public.trademark_application_status add value 'awaiting_acceleration';
  end if;
end;
$$;

-- Add 'preparing_acceleration' - preparing documents for priority examination
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'preparing_acceleration'
  ) then
    alter type public.trademark_application_status add value 'preparing_acceleration';
  end if;
end;
$$;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

comment on type public.trademark_application_status is 'Trademark application workflow states including priority examination stages';
