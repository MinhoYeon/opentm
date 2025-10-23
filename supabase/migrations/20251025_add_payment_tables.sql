-- Payment infrastructure for Toss integration and bank transfer tracking
create extension if not exists pgcrypto;

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  application_id uuid references public.trademark_applications(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  amount numeric(12,2) not null,
  currency text not null default 'KRW',
  status text not null default 'prepared',
  payment_method text,
  payment_key text,
  toss_checkout_url text,
  toss_receipt_url text,
  raw_request jsonb not null default '{}'::jsonb,
  raw_response jsonb,
  confirm_response jsonb,
  last_webhook_type text,
  bank_confirm_requested_at timestamptz,
  bank_confirmed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.payment_intents is 'Toss payment intents tracked for applications.';
comment on column public.payment_intents.order_id is 'Order identifier used with Toss Payments.';
comment on column public.payment_intents.status is 'Local status mirror (prepared, pending_virtual_account, confirmed, cancelled, failed, pending_bank_transfer, etc).';

create index if not exists payment_intents_user_id_idx on public.payment_intents (user_id);
create index if not exists payment_intents_application_id_idx on public.payment_intents (application_id);
create index if not exists payment_intents_status_idx on public.payment_intents (status);

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  intent_id uuid references public.payment_intents(id) on delete cascade,
  event_type text not null,
  status text,
  signature text,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

comment on table public.payment_events is 'Webhook history from Toss Payments.';

create index if not exists payment_events_intent_idx on public.payment_events (intent_id, received_at desc);

create table if not exists public.bank_transfer_confirmations (
  id bigint generated always as identity primary key,
  intent_id uuid references public.payment_intents(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  note text,
  requested_at timestamptz not null default now(),
  processed boolean not null default false,
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.bank_transfer_confirmations is 'Manual bank transfer confirmation requests from applicants.';

create index if not exists bank_transfer_confirmations_intent_idx on public.bank_transfer_confirmations (intent_id, requested_at desc);

create or replace function public.set_current_timestamp_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger payment_intents_set_updated_at
  before update on public.payment_intents
  for each row
  execute function public.set_current_timestamp_updated_at();

alter table public.payment_intents enable row level security;
alter table public.payment_events enable row level security;
alter table public.bank_transfer_confirmations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_intents'
      and policyname = 'Service role full access - payment intents'
  ) then
    create policy "Service role full access - payment intents"
      on public.payment_intents
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_intents'
      and policyname = 'Users select own payment intents'
  ) then
    create policy "Users select own payment intents"
      on public.payment_intents
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_events'
      and policyname = 'Service role manage payment events'
  ) then
    create policy "Service role manage payment events"
      on public.payment_events
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transfer_confirmations'
      and policyname = 'Service role manage bank confirmations'
  ) then
    create policy "Service role manage bank confirmations"
      on public.bank_transfer_confirmations
      for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transfer_confirmations'
      and policyname = 'Users insert bank confirmations'
  ) then
    create policy "Users insert bank confirmations"
      on public.bank_transfer_confirmations
      for insert
      with check (auth.uid() = user_id);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bank_transfer_confirmations'
      and policyname = 'Users view own bank confirmations'
  ) then
    create policy "Users view own bank confirmations"
      on public.bank_transfer_confirmations
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

create or replace function public.confirm_payment_intent(
  p_order_id text,
  p_payment_key text,
  p_amount numeric,
  p_confirm_response jsonb
)
returns public.payment_intents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.payment_intents;
  v_application_status public.trademark_application_status;
begin
  select *
    into v_intent
    from public.payment_intents
   where order_id = p_order_id
   for update;

  if not found then
    raise exception 'Payment intent not found for order id %', p_order_id
      using errcode = 'P0002';
  end if;

  if v_intent.amount <> p_amount then
    raise exception 'Amount mismatch for order id %', p_order_id
      using errcode = '22000';
  end if;

  if v_intent.application_id is not null then
    select status
      into v_application_status
      from public.trademark_applications
     where id = v_intent.application_id
     for update;

    if not found then
      raise exception 'Application not found for id %', v_intent.application_id
        using errcode = 'P0002';
    end if;
  end if;

  update public.payment_intents
     set status = 'confirmed',
         payment_key = p_payment_key,
         confirm_response = p_confirm_response,
         payment_method = coalesce(p_confirm_response ->> 'method', payment_method),
         toss_receipt_url = coalesce(p_confirm_response ->> 'receiptUrl', toss_receipt_url),
         updated_at = now()
   where id = v_intent.id
   returning * into v_intent;

  if v_intent.application_id is not null then
    update public.trademark_applications
       set status = 'payment_received',
           payment_reference = p_payment_key,
           payment_received_at = coalesce(payment_received_at, now()),
           status_updated_at = now()
     where id = v_intent.application_id;

    insert into public.trademark_status_logs (application_id, from_status, to_status, note, metadata)
    values (
      v_intent.application_id,
      v_application_status,
      'payment_received',
      '자동 결제 확인',
      jsonb_build_object('orderId', p_order_id, 'paymentKey', p_payment_key)
    );
  end if;

  return v_intent;
end;
$$;

