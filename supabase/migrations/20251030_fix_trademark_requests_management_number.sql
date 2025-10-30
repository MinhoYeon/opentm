-- Fix trademark_requests management_number to auto-generate
-- This migration adds a default value to management_number column to prevent unique constraint violations

-- Drop the unique constraint temporarily
alter table public.trademark_requests
  drop constraint if exists trademark_requests_management_number_key;

-- Set default value for management_number using the existing sequence
alter table public.trademark_requests
  alter column management_number set default (
    'TM' || to_char(nextval('public.trademark_management_number_seq'), 'FM000000')
  );

-- Re-add the unique constraint
alter table public.trademark_requests
  add constraint trademark_requests_management_number_key unique (management_number);

-- Update existing NULL management_numbers with generated values
update public.trademark_requests
set management_number = 'TM' || to_char(nextval('public.trademark_management_number_seq'), 'FM000000')
where management_number is null;

comment on column public.trademark_requests.management_number is 'Auto-generated sequential identifier (e.g., TM000001)';
