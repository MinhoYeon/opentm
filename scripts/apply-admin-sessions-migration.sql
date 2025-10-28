-- Admin Sessions Migration
-- This script creates the admin_sessions table and related policies
-- Run this in your Supabase SQL Editor if the table doesn't exist

-- Enable required extensions
create extension if not exists pgcrypto;

-- Helper function for updating timestamps
create or replace function public.set_current_timestamp_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create admin_sessions table
create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_hash text not null unique,
  is_revoked boolean not null default false,
  mfa_verified_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create trigger for updating updated_at
do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'admin_sessions_set_updated_at'
      and n.nspname = 'public'
      and c.relname = 'admin_sessions'
  ) then
    create trigger admin_sessions_set_updated_at
      before update on public.admin_sessions
      for each row
      execute function public.set_current_timestamp_updated_at();
  end if;
end $$;

-- Enable Row Level Security
alter table public.admin_sessions enable row level security;

-- Create policy for service role access
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_sessions'
      and policyname = 'Service role manage admin sessions'
  ) then
    create policy "Service role manage admin sessions"
      on public.admin_sessions for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- Verify table was created
select
  'admin_sessions table created successfully!' as message,
  count(*) as current_row_count
from public.admin_sessions;
