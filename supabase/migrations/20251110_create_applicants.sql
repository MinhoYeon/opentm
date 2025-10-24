-- Applicants master tables and encryption helpers

create extension if not exists pgcrypto;

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Backwards-compatible wrapper for legacy triggers referencing the old helper name.
create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
  return public.set_updated_at_timestamp();
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

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'phone_secret'
  ) then
    execute 'alter table public.applicants add column phone_secret jsonb';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'phone_masked'
  ) then
    execute 'alter table public.applicants add column phone_masked text';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'address_secret'
  ) then
    execute 'alter table public.applicants add column address_secret jsonb';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'address_masked'
  ) then
    execute 'alter table public.applicants add column address_masked text';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'business_type'
  ) then
    execute 'alter table public.applicants add column business_type text';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'business_number_secret'
  ) then
    execute 'alter table public.applicants add column business_number_secret jsonb';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'business_number_masked'
  ) then
    execute 'alter table public.applicants add column business_number_masked text';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'metadata'
  ) then
    execute 'alter table public.applicants add column metadata jsonb not null default ''{}''::jsonb';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'is_favorite'
  ) then
    execute 'alter table public.applicants add column is_favorite boolean not null default false';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'last_used_at'
  ) then
    execute 'alter table public.applicants add column last_used_at timestamptz';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'created_at'
  ) then
    execute 'alter table public.applicants add column created_at timestamptz not null default now()';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'updated_at'
  ) then
    execute 'alter table public.applicants add column updated_at timestamptz not null default now()';
  end if;
end $$;

do $$
declare
  target_column text;
begin
  select column_name
    into target_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'applicants'
    and column_name in ('phone_secret', 'phone_ciphertext')
  order by case column_name when 'phone_secret' then 0 else 1 end
  limit 1;

  if target_column is not null then
    execute format(
      'comment on column public.applicants.%I is %L',
      target_column,
      'AES-GCM encrypted phone number payload.'
    );
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'applicants'
      and column_name = 'business_number_secret'
  ) then
    execute format(
      'comment on column public.applicants.%I is %L',
      'business_number_secret',
      'AES-GCM encrypted business registration number payload.'
    );
  end if;
end $$;

create index if not exists applicants_user_id_idx on public.applicants (user_id, is_favorite desc, last_used_at desc nulls last, updated_at desc);
create index if not exists applicants_email_idx on public.applicants (email);

create trigger set_timestamp_applicants
  before update on public.applicants
  for each row
  execute function public.set_updated_at_timestamp();

alter table public.applicants enable row level security;

drop policy if exists "Users select their applicants" on public.applicants;
create policy "Users select their applicants"
  on public.applicants
  for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their applicants" on public.applicants;
create policy "Users insert their applicants"
  on public.applicants
  for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their applicants" on public.applicants;
create policy "Users update their applicants"
  on public.applicants
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their applicants" on public.applicants;
create policy "Users delete their applicants"
  on public.applicants
  for delete
  using ((select auth.uid()) = user_id);

create table if not exists public.trademark_request_applicants (
  request_id uuid not null references public.trademark_requests(id) on delete cascade,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (request_id, applicant_id)
);

comment on table public.trademark_request_applicants is 'Associates a saved applicant with a trademark onboarding request.';

drop trigger if exists set_timestamp_trademark_request_applicants on public.trademark_request_applicants;

create trigger set_timestamp_trademark_request_applicants
  before update on public.trademark_request_applicants
  for each row
  execute function public.set_updated_at_timestamp();

alter table public.trademark_request_applicants enable row level security;

drop policy if exists "Users manage their request applicants" on public.trademark_request_applicants;
create policy "Users manage their request applicants"
  on public.trademark_request_applicants
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.trademark_request_applicants
  drop constraint if exists trademark_request_applicants_pkey;

alter table public.trademark_request_applicants
  add constraint trademark_request_applicants_pkey primary key (request_id, applicant_id);

create index if not exists trademark_request_applicants_applicant_id_idx on public.trademark_request_applicants (applicant_id);
create index if not exists trademark_request_applicants_user_id_idx on public.trademark_request_applicants (user_id);

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

drop trigger if exists set_timestamp_trademark_applicants on public.trademark_applicants;

create trigger set_timestamp_trademark_applicants
  before update on public.trademark_applicants
  for each row
  execute function public.set_updated_at_timestamp();

alter table public.trademark_applicants enable row level security;

drop policy if exists "Users manage their application applicants" on public.trademark_applicants;
create policy "Users manage their application applicants"
  on public.trademark_applicants
  for all
  using (
    (select auth.uid()) = (
      select user_id from public.trademark_applications where id = application_id
    )
  )
  with check (
    (select auth.uid()) = (
      select user_id from public.trademark_applications where id = application_id
    )
  );

create index if not exists trademark_applicants_applicant_id_idx on public.trademark_applicants (applicant_id);
