-- Adds payments and payment_events tables for Toss payment processing
-- Provides idempotent RPC process_toss_payment_event to handle webhook events

-- Ensure helper function exists
create or replace function public.set_current_timestamp_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  payment_method text,
  payment_status text not null default 'pending',
  transaction_id text,
  amount numeric(12,2),
  currency text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'payments_set_updated_at'
      and n.nspname = 'public'
      and c.relname = 'payments'
  ) then
    create trigger payments_set_updated_at
      before update on public.payments
      for each row
      execute function public.set_current_timestamp_updated_at();
  end if;
end $$;

create index if not exists payments_transaction_id_idx on public.payments (transaction_id);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  order_id text not null,
  event_type text,
  processed_at timestamptz not null default now(),
  raw_payload jsonb not null
);

create index if not exists payment_events_order_id_idx on public.payment_events (order_id);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'Service role manage payments'
  ) then
    create policy "Service role manage payments"
      on public.payments for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_events'
      and policyname = 'Service role manage payment events'
  ) then
    create policy "Service role manage payment events"
      on public.payment_events for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

create or replace function public.process_toss_payment_event(
  p_event_id text,
  p_event_type text,
  p_order_id text,
  p_payment_key text,
  p_payment_method text,
  p_payment_status text,
  p_raw_payload jsonb
)
returns boolean
language plpgsql
as $$
declare
  inserted boolean := false;
begin
  insert into public.payment_events (event_id, order_id, event_type, raw_payload)
  values (p_event_id, p_order_id, p_event_type, p_raw_payload)
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  inserted := true;

  insert into public.payments (order_id, payment_method, payment_status, transaction_id, raw_payload)
  values (p_order_id, nullif(p_payment_method, ''), p_payment_status, p_payment_key, p_raw_payload)
  on conflict (order_id) do update set
    payment_method = coalesce(excluded.payment_method, public.payments.payment_method),
    payment_status = excluded.payment_status,
    transaction_id = excluded.transaction_id,
    raw_payload = excluded.raw_payload,
    updated_at = now();

  return true;
exception
  when others then
    if inserted then
      delete from public.payment_events where event_id = p_event_id;
    end if;
    raise;
end;
$$;
