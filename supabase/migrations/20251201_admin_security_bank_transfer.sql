-- Admin security pipeline support
create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

alter table public.admin_sessions enable row level security;

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

-- Refund requests table
create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payment_intents(id) on delete cascade,
  reason text not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','processed')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'refund_requests_set_updated_at'
      and n.nspname = 'public'
      and c.relname = 'refund_requests'
  ) then
    create trigger refund_requests_set_updated_at
      before update on public.refund_requests
      for each row
      execute function public.set_current_timestamp_updated_at();
  end if;
end $$;

create unique index if not exists refund_requests_payment_id_unique_pending
  on public.refund_requests(payment_id)
  where status = 'pending';

create index if not exists refund_requests_status_idx on public.refund_requests(status);
create index if not exists refund_requests_requested_by_idx on public.refund_requests(requested_by);
create index if not exists refund_requests_processed_at_idx
  on public.refund_requests(processed_at)
  where processed_at is not null;

alter table public.refund_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'refund_requests'
      and policyname = 'Service role manage refund requests'
  ) then
    create policy "Service role manage refund requests"
      on public.refund_requests for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- Address search logging table
create table if not exists public.address_search_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  query_hash text not null,
  masked_query text not null,
  event_type text not null default 'search',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists address_search_logs_user_id_idx on public.address_search_logs(user_id);
create index if not exists address_search_logs_query_hash_idx on public.address_search_logs(query_hash);
create index if not exists address_search_logs_event_idx on public.address_search_logs(event_type, created_at desc);

alter table public.address_search_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'address_search_logs'
      and policyname = 'Service role manage address search logs'
  ) then
    create policy "Service role manage address search logs"
      on public.address_search_logs for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- Extend bank transfer confirmations with admin workflow fields
alter table public.bank_transfer_confirmations
  add column if not exists status text not null default 'pending',
  add column if not exists processed_by uuid references auth.users(id) on delete set null,
  add column if not exists memo text;

create index if not exists bank_transfer_confirmations_status_idx
  on public.bank_transfer_confirmations(status, requested_at desc);
create index if not exists bank_transfer_confirmations_processed_by_idx
  on public.bank_transfer_confirmations(processed_by);

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  amount numeric,
  currency text,
  status text not null default 'requires_payment_method',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);