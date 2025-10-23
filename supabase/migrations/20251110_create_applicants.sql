-- Applicants master tables and encryption helpers

create extension if not exists pgcrypto;

-- Ensure timestamp trigger exists
create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  phone_secret jsonb,
  phone_masked text,
  address_secret jsonb,
  address_masked text,
  business_type text,
  business_number_secret jsonb,
  business_number_masked text,
  metadata jsonb not null default '{}'::jsonb,
  is_favorite boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applicants_email_check check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

comment on table public.applicants is 'Reusable applicant profiles owned by an auth user.';
comment on column public.applicants.phone_secret is 'AES-GCM encrypted phone number payload.';
comment on column public.applicants.business_number_secret is 'AES-GCM encrypted business registration number payload.';

create index if not exists applicants_user_id_idx on public.applicants (user_id, is_favorite desc, last_used_at desc nulls last, updated_at desc);
create index if not exists applicants_email_idx on public.applicants (email);

create trigger set_timestamp_applicants
  before update on public.applicants
  for each row
  execute function public.set_current_timestamp();

alter table public.applicants enable row level security;

drop policy if exists "Users select their applicants" on public.applicants;
create policy "Users select their applicants"
  on public.applicants
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert their applicants" on public.applicants;
create policy "Users insert their applicants"
  on public.applicants
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update their applicants" on public.applicants;
create policy "Users update their applicants"
  on public.applicants
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users delete their applicants" on public.applicants;
create policy "Users delete their applicants"
  on public.applicants
  for delete
  using (auth.uid() = user_id);

create table if not exists public.trademark_request_applicants (
  request_id uuid primary key references public.trademark_requests(id) on delete cascade,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.trademark_request_applicants is 'Associates a saved applicant with a trademark onboarding request.';

create trigger set_timestamp_trademark_request_applicants
  before update on public.trademark_request_applicants
  for each row
  execute function public.set_current_timestamp();

alter table public.trademark_request_applicants enable row level security;

drop policy if exists "Users manage their request applicants" on public.trademark_request_applicants;
create policy "Users manage their request applicants"
  on public.trademark_request_applicants
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.trademark_applicants (
  application_id uuid not null references public.trademark_applications(id) on delete cascade,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (application_id, applicant_id)
);

comment on table public.trademark_applicants is 'Join table between trademark applications and applicant profiles.';

create trigger set_timestamp_trademark_applicants
  before update on public.trademark_applicants
  for each row
  execute function public.set_current_timestamp();

alter table public.trademark_applicants enable row level security;

drop policy if exists "Users manage their application applicants" on public.trademark_applicants;
create policy "Users manage their application applicants"
  on public.trademark_applicants
  for all
  using (
    auth.uid() = (
      select user_id from public.trademark_applications where id = application_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from public.trademark_applications where id = application_id
    )
  );
