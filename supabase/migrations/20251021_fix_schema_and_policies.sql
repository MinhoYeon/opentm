-- Idempotent migration to align DB with app expectations
-- - Ensures public.trademark_requests (columns, FK, indexes)
-- - Optionally ensures public.profiles (recommended)
-- - Enables RLS + policies for both tables
-- - Ensures storage bucket 'trademark-images'

-- 1) Optional profiles table (recommended)
create table if not exists public.profiles (
  id uuid primary key default auth.uid(),
  email text unique,
  name text,
  phone text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at fresh on update
create or replace function public.set_current_timestamp_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'profiles_set_updated_at'
      and n.nspname = 'public'
      and c.relname = 'profiles'
  ) then
    create trigger profiles_set_updated_at
    before update on public.profiles
    for each row
    execute function public.set_current_timestamp_updated_at();
  end if;
end $$;

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='Profiles select own'
  ) then
    create policy "Profiles select own"
      on public.profiles for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and policyname='Profiles upsert own'
  ) then
    create policy "Profiles upsert own"
      on public.profiles for all
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

-- 2) trademark_requests table (as used by the app)
create table if not exists public.trademark_requests (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  brand_name text not null,
  trademark_type text not null,
  image_url text,
  image_storage_path text,
  product_classes text[] not null default '{}'::text[],
  representative_email text not null,
  additional_notes text,
  submitted_at timestamptz not null default now(),
  status text not null default 'submitted',
  status_detail text,
  status_updated_at timestamptz not null default now()
);

-- Ensure missing columns (if table existed) are added
alter table public.trademark_requests
  add column if not exists user_id uuid,
  add column if not exists brand_name text,
  add column if not exists trademark_type text,
  add column if not exists image_url text,
  add column if not exists image_storage_path text,
  add column if not exists product_classes text[] default '{}'::text[],
  add column if not exists representative_email text,
  add column if not exists additional_notes text,
  add column if not exists submitted_at timestamptz default now(),
  add column if not exists status text default 'submitted',
  add column if not exists status_detail text,
  add column if not exists status_updated_at timestamptz default now();

-- Ensure PK on id
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conrelid = 'public.trademark_requests'::regclass 
      and contype = 'p'
  ) then
    alter table public.trademark_requests
      add constraint trademark_requests_pkey primary key (id);
  end if;
end $$;

-- Ensure FK user_id -> auth.users(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint 
    where conrelid='public.trademark_requests'::regclass 
      and contype='f' and conname='trademark_requests_user_id_fkey'
  ) then
    alter table public.trademark_requests
      add constraint trademark_requests_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- Helpful indexes
create index if not exists trademark_requests_user_id_idx on public.trademark_requests (user_id);
create index if not exists trademark_requests_submitted_at_idx on public.trademark_requests (submitted_at desc);

-- RLS + policies
alter table public.trademark_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='trademark_requests' and policyname='Users can view their trademark requests'
  ) then
    create policy "Users can view their trademark requests"
      on public.trademark_requests for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='trademark_requests' and policyname='Users can insert their trademark requests'
  ) then
    create policy "Users can insert their trademark requests"
      on public.trademark_requests for insert
      with check (auth.uid() = user_id);
  end if;

  -- Admin (service role) broader access for moderation/status updates
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='trademark_requests' and policyname='Service role full access'
  ) then
    create policy "Service role full access"
      on public.trademark_requests for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- 3) Storage bucket for trademark images
-- Public bucket is expected by the app (uses /object/public URLs)
select case
  when exists(select 1 from storage.buckets where id = 'trademark-images') then null
  else storage.create_bucket(
    'trademark-images',
    jsonb_build_object('public', true, 'file_size_limit', 5242880)
  )
end;

-- Optional: storage policies (not required for service_role uploads)
-- Allow read for everyone (public bucket fast path usually suffices, but keep for completeness)
do $$
begin
  if not exists (
    select 1 from storage.policies where name='Public read - trademark-images' and bucket_id='trademark-images'
  ) then
    insert into storage.policies (name, bucket_id, definition)
    values ('Public read - trademark-images', 'trademark-images', '(
      ( bucket_id = ''trademark-images'' )
      AND ( operation = ''SELECT'' )
    )');
  end if;
end $$;

