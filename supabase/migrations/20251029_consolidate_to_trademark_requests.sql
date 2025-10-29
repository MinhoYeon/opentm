-- Consolidate trademark_applications into trademark_requests
-- This migration combines both tables into a single trademark_requests table

set check_function_bodies = off;

-- ============================================================================
-- Step 1: Add new columns to trademark_requests
-- ============================================================================

-- Add management number sequence if not exists
do $$
begin
  if not exists (
    select 1 from pg_class
    where relname = 'trademark_management_number_seq'
  ) then
    create sequence public.trademark_management_number_seq
      increment 1
      minvalue 1
      start with 1;
  end if;
end;
$$;

-- Add new columns to trademark_requests
alter table public.trademark_requests
  add column if not exists management_number text unique,
  add column if not exists applicant_name text,
  add column if not exists applicant_email text,
  add column if not exists applicant_phone text,
  add column if not exists goods_description text,
  add column if not exists filing_receipt_number text,
  add column if not exists filing_submission_reference text,
  add column if not exists filing_submitted_at timestamptz,
  add column if not exists filed_at timestamptz,
  add column if not exists filing_office text,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists notes text,
  add column if not exists tags text[] default '{}',
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

-- Add normalized brand name for searching
alter table public.trademark_requests
  add column if not exists normalized_brand_name text
    generated always as (
      lower(regexp_replace(brand_name, '\\s+', ' ', 'g'))
    ) stored;

-- Create indexes for new columns
create index if not exists trademark_requests_management_number_idx
  on public.trademark_requests (management_number);
create index if not exists trademark_requests_status_idx
  on public.trademark_requests (status);
create index if not exists trademark_requests_normalized_brand_idx
  on public.trademark_requests (normalized_brand_name);
create index if not exists trademark_requests_assigned_to_idx
  on public.trademark_requests (assigned_to);
create index if not exists trademark_requests_filed_at_idx
  on public.trademark_requests (filed_at);

-- ============================================================================
-- Step 2: Migrate data from trademark_applications to trademark_requests
-- ============================================================================

-- Update existing trademark_requests with data from trademark_applications
update public.trademark_requests tr
set
  management_number = ta.management_number,
  applicant_name = coalesce(tr.applicant_name, ta.metadata->>'applicant_name'),
  applicant_email = coalesce(tr.applicant_email, ta.metadata->>'applicant_email'),
  applicant_phone = ta.metadata->>'applicant_phone',
  goods_description = ta.goods_description,
  filing_receipt_number = ta.filing_receipt_number,
  filing_submission_reference = ta.filing_submission_reference,
  filing_submitted_at = ta.filing_submitted_at,
  filed_at = ta.filed_at,
  filing_office = ta.filing_office,
  assigned_to = ta.assigned_to,
  notes = ta.notes,
  metadata = ta.metadata,
  status = ta.status::text,
  status_detail = ta.status_detail,
  status_updated_at = ta.status_updated_at,
  updated_at = ta.updated_at
from public.trademark_applications ta
where ta.request_id = tr.id;

-- ============================================================================
-- Step 3: Update trademark_payments to reference trademark_requests
-- ============================================================================

-- Add new request_id column to trademark_payments
alter table public.trademark_payments
  add column if not exists request_id uuid references public.trademark_requests(id) on delete cascade;

-- Migrate application_id to request_id
update public.trademark_payments tp
set request_id = ta.request_id
from public.trademark_applications ta
where tp.application_id = ta.id and ta.request_id is not null;

-- Update payments for requests without applications (set request_id to application_id if needed)
update public.trademark_payments tp
set request_id = tp.application_id
where tp.request_id is null
  and exists (
    select 1 from public.trademark_requests tr where tr.id = tp.application_id
  );

-- Create index on new column
create index if not exists trademark_payments_request_id_idx
  on public.trademark_payments (request_id);

-- ============================================================================
-- Step 4: Drop old application_id column and constraints
-- ============================================================================

-- Note: We'll keep application_id for now to maintain backward compatibility
-- It can be manually dropped later after verifying the migration

-- ============================================================================
-- Step 5: Update RLS policies for trademark_requests
-- ============================================================================

-- Drop old policies if they exist
drop policy if exists "Users can view their trademark requests" on public.trademark_requests;
drop policy if exists "Users can insert their trademark requests" on public.trademark_requests;
drop policy if exists "Users can update their trademark requests" on public.trademark_requests;
drop policy if exists "Admins can view all trademark requests" on public.trademark_requests;
drop policy if exists "Admins can update all trademark requests" on public.trademark_requests;

-- Create comprehensive RLS policies
create policy "Users can view their trademark requests"
  on public.trademark_requests
  for select
  using (auth.uid() = user_id or public.is_admin_context());

create policy "Users can insert their trademark requests"
  on public.trademark_requests
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own trademark requests"
  on public.trademark_requests
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins can insert trademark requests"
  on public.trademark_requests
  for insert
  with check (public.is_admin_context());

create policy "Admins can update trademark requests"
  on public.trademark_requests
  for update
  using (public.is_admin_context())
  with check (public.is_admin_context());

create policy "Admins can delete trademark requests"
  on public.trademark_requests
  for delete
  using (public.is_admin_context());

-- ============================================================================
-- Step 6: Update triggers
-- ============================================================================

-- Create updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_trademark_requests_updated_at on public.trademark_requests;
create trigger update_trademark_requests_updated_at
  before update on public.trademark_requests
  for each row
  execute function public.update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

comment on table public.trademark_requests is 'Unified trademark applications - from initial request through completion';
comment on column public.trademark_requests.management_number is 'Sequential human-readable identifier (e.g. TM000123)';
comment on column public.trademark_requests.applicant_name is 'Name of the trademark applicant';
comment on column public.trademark_requests.applicant_email is 'Email of the trademark applicant';
comment on column public.trademark_requests.filing_receipt_number is 'Receipt number from patent office';
comment on column public.trademark_requests.filed_at is 'Date when trademark was filed with patent office';
comment on column public.trademark_requests.assigned_to is 'Admin user assigned to handle this trademark';
comment on column public.trademark_requests.metadata is 'JSON metadata for extensibility';
