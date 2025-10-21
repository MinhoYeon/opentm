-- Create table for trademark requests
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

comment on table public.trademark_requests is 'Trademark filing requests submitted from the onboarding wizard.';
comment on column public.trademark_requests.brand_name is 'Brand or service name provided by the applicant.';
comment on column public.trademark_requests.trademark_type is 'Type of trademark (word, logo, combined, etc.).';
comment on column public.trademark_requests.image_url is 'Public URL for the uploaded trademark image.';
comment on column public.trademark_requests.image_storage_path is 'Internal storage path of the uploaded trademark image.';
comment on column public.trademark_requests.product_classes is 'Product/service classes associated with the request.';
comment on column public.trademark_requests.status is 'Current review status of the trademark request.';
comment on column public.trademark_requests.status_detail is 'Human readable explanation of the current status.';

create index if not exists trademark_requests_user_id_idx on public.trademark_requests (user_id);
create index if not exists trademark_requests_submitted_at_idx on public.trademark_requests (submitted_at desc);

alter table public.trademark_requests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trademark_requests' and policyname = 'Users can view their trademark requests'
  ) then
    create policy "Users can view their trademark requests"
      on public.trademark_requests
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'trademark_requests' and policyname = 'Users can insert their trademark requests'
  ) then
    create policy "Users can insert their trademark requests"
      on public.trademark_requests
      for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Ensure a public bucket exists for trademark images
select
  case
    when exists(select 1 from storage.buckets where id = 'trademark-images')
      then null
    else storage.create_bucket(
      'trademark-images',
      jsonb_build_object(
        'public', true,
        'file_size_limit', 5242880
      )
    )
  end;
