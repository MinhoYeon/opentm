-- Add comprehensive case status workflow and trademark_payments table
-- This migration extends the trademark_application_status enum with all workflow stages
-- and creates a dedicated payments table to track multiple payment stages per application

set check_function_bodies = off;

-- ============================================================================
-- Part 1: Extend trademark_application_status enum with new workflow stages
-- ============================================================================

-- Add 'submitted' - initial state when user submits request
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'submitted'
  ) then
    alter type public.trademark_application_status add value 'submitted';
  end if;
end;
$$;

-- Add 'awaiting_applicant_info' - waiting for additional documents
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'awaiting_applicant_info'
  ) then
    alter type public.trademark_application_status add value 'awaiting_applicant_info';
  end if;
end;
$$;

-- Add 'applicant_info_completed' - all documents received
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'applicant_info_completed'
  ) then
    alter type public.trademark_application_status add value 'applicant_info_completed';
  end if;
end;
$$;

-- Add 'under_examination' - KIPO is examining the application
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'under_examination'
  ) then
    alter type public.trademark_application_status add value 'under_examination';
  end if;
end;
$$;

-- Add 'awaiting_office_action' - received office action, waiting for client decision
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'awaiting_office_action'
  ) then
    alter type public.trademark_application_status add value 'awaiting_office_action';
  end if;
end;
$$;

-- Add 'responding_to_office_action' - preparing response/amendment
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'responding_to_office_action'
  ) then
    alter type public.trademark_application_status add value 'responding_to_office_action';
  end if;
end;
$$;

-- Add 'publication_announced' - application published for opposition
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'publication_announced'
  ) then
    alter type public.trademark_application_status add value 'publication_announced';
  end if;
end;
$$;

-- Add 'registration_decided' - registration decision received
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'registration_decided'
  ) then
    alter type public.trademark_application_status add value 'registration_decided';
  end if;
end;
$$;

-- Add 'registration_fee_paid' - registration fee paid to KIPO
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'registration_fee_paid'
  ) then
    alter type public.trademark_application_status add value 'registration_fee_paid';
  end if;
end;
$$;

-- Add 'registered' - trademark certificate issued
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'registered'
  ) then
    alter type public.trademark_application_status add value 'registered';
  end if;
end;
$$;

-- Add 'withdrawn' - client withdrew or abandoned application
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'trademark_application_status'
      and e.enumlabel = 'withdrawn'
  ) then
    alter type public.trademark_application_status add value 'withdrawn';
  end if;
end;
$$;

-- ============================================================================
-- Part 2: Create trademark_payments table for multi-stage payment tracking
-- ============================================================================

create table if not exists public.trademark_payments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.trademark_applications(id) on delete cascade,

  -- Payment stage: filing, office_action, or registration
  payment_stage text not null,

  -- Payment status: not_requested, quote_sent, unpaid, partial, paid, overdue, refund_requested, refunded
  payment_status text not null default 'not_requested',

  -- Amount information
  amount numeric(12,2),
  paid_amount numeric(12,2) default 0,
  currency text default 'KRW',

  -- Date tracking
  quote_sent_at timestamptz,
  due_at timestamptz,
  paid_at timestamptz,

  -- Payer information
  remitter_name text,
  payment_method text,
  transaction_reference text,

  -- Additional notes and metadata
  notes text,
  metadata jsonb default '{}'::jsonb,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Constraints
  constraint valid_payment_stage check (
    payment_stage in ('filing', 'office_action', 'registration')
  ),
  constraint valid_payment_status check (
    payment_status in (
      'not_requested', 'quote_sent', 'unpaid', 'partial',
      'paid', 'overdue', 'refund_requested', 'refunded'
    )
  ),
  constraint valid_amounts check (
    paid_amount >= 0 and
    (amount is null or amount >= 0) and
    (amount is null or paid_amount <= amount)
  )
);

-- Comments for documentation
comment on table public.trademark_payments is 'Tracks multi-stage payments for trademark applications (filing, office action, registration)';
comment on column public.trademark_payments.payment_stage is 'Payment stage: filing, office_action, or registration';
comment on column public.trademark_payments.payment_status is 'Current payment status';
comment on column public.trademark_payments.amount is 'Total amount to be paid';
comment on column public.trademark_payments.paid_amount is 'Amount already paid (for partial payments)';

-- Indexes for performance
create index if not exists trademark_payments_application_id_idx
  on public.trademark_payments(application_id);

create index if not exists trademark_payments_stage_idx
  on public.trademark_payments(payment_stage);

create index if not exists trademark_payments_status_idx
  on public.trademark_payments(payment_status);

create index if not exists trademark_payments_due_at_idx
  on public.trademark_payments(due_at)
  where payment_status in ('unpaid', 'partial');

-- Unique constraint: one payment record per application per stage
create unique index if not exists trademark_payments_application_stage_unique
  on public.trademark_payments(application_id, payment_stage);

-- Trigger to maintain updated_at
do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'set_timestamp_trademark_payments'
      and n.nspname = 'public'
      and c.relname = 'trademark_payments'
  ) then
    create trigger set_timestamp_trademark_payments
      before update on public.trademark_payments
      for each row
      execute function public.set_current_timestamp();
  end if;
end $$;

-- ============================================================================
-- Part 3: Row Level Security policies for trademark_payments
-- ============================================================================

alter table public.trademark_payments enable row level security;

-- Users can view payments for their own applications
drop policy if exists "Users can view payments for their applications" on public.trademark_payments;
create policy "Users can view payments for their applications"
  on public.trademark_payments
  for select
  using (
    exists (
      select 1
      from public.trademark_applications ta
      where ta.id = application_id and ta.user_id = auth.uid()
    )
  );

-- Admins can manage all payment records
drop policy if exists "Admins can manage all payments" on public.trademark_payments;
create policy "Admins can manage all payments"
  on public.trademark_payments
  for all
  using (public.is_admin_context())
  with check (public.is_admin_context());

-- ============================================================================
-- Part 4: Helper function to check payment completion
-- ============================================================================

create or replace function public.is_payment_completed(
  p_application_id uuid,
  p_payment_stage text
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_payment_status text;
begin
  select payment_status into v_payment_status
  from public.trademark_payments
  where application_id = p_application_id
    and payment_stage = p_payment_stage;

  return v_payment_status = 'paid';
exception
  when others then
    return false;
end;
$$;

comment on function public.is_payment_completed(uuid, text) is 'Checks if a specific payment stage is completed for an application';

grant execute on function public.is_payment_completed(uuid, text) to authenticated, service_role;
