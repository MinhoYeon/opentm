-- Ensure pgcrypto is available for symmetric encryption
create extension if not exists pgcrypto;

-- Helper to fetch the per-session encryption key
create or replace function public.require_app_encryption_key()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  key text := nullif(current_setting('app.encryption_key', true), '');
begin
  if key is null then
    raise exception 'app.encryption_key is not set for this session';
  end if;
  return key;
end;
$$;
comment on function public.require_app_encryption_key is 'Returns the symmetric key used for applicant data encryption (expects app.encryption_key GUC to be configured).';
revoke all on function public.require_app_encryption_key() from public;
grant execute on function public.require_app_encryption_key() to authenticated, service_role;

-- Wrapper functions for applicant field encryption/decryption/masking
create or replace function public.encrypt_applicant_field(plaintext text)
returns bytea
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if plaintext is null then
    return null;
  end if;
  return pgp_sym_encrypt(plaintext, public.require_app_encryption_key(), 'compress-algo=1,cipher-algo=aes256');
end;
$$;
comment on function public.encrypt_applicant_field is 'Encrypts a text payload for storage in applicant tables using pgcrypto.''s pgp_sym_encrypt.';
revoke all on function public.encrypt_applicant_field(text) from public;
grant execute on function public.encrypt_applicant_field(text) to authenticated, service_role;

create or replace function public.decrypt_applicant_field(ciphertext bytea)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if ciphertext is null then
    return null;
  end if;
  return pgp_sym_decrypt(ciphertext, public.require_app_encryption_key());
end;
$$;
comment on function public.decrypt_applicant_field is 'Decrypts an applicant field ciphertext with the configured symmetric key.';
revoke all on function public.decrypt_applicant_field(bytea) from public;
grant execute on function public.decrypt_applicant_field(bytea) to authenticated, service_role;

create or replace function public.mask_applicant_field(ciphertext bytea, visible_prefix integer default 2, visible_suffix integer default 2)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  decrypted text;
  length integer;
  effective_prefix integer := greatest(0, coalesce(visible_prefix, 0));
  effective_suffix integer := greatest(0, coalesce(visible_suffix, 0));
begin
  if ciphertext is null then
    return null;
  end if;

  decrypted := pgp_sym_decrypt(ciphertext, public.require_app_encryption_key());
  if decrypted is null then
    return null;
  end if;

  length := char_length(decrypted);
  if length <= effective_prefix + effective_suffix then
    return decrypted;
  end if;

  return concat(
    substr(decrypted, 1, effective_prefix),
    repeat('•', greatest(length - (effective_prefix + effective_suffix), 0)),
    substr(decrypted, length - effective_suffix + 1)
  );
end;
$$;
comment on function public.mask_applicant_field is 'Decrypts and partially masks an applicant field for safe display in logs and dashboards.';
revoke all on function public.mask_applicant_field(bytea, integer, integer) from public;
grant execute on function public.mask_applicant_field(bytea, integer, integer) to authenticated, service_role;

-- Applicants master table
create table if not exists public.applicants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  legal_name_ciphertext bytea not null,
  legal_name_hash text not null,
  email_ciphertext bytea not null,
  email_hash text not null,
  phone_ciphertext bytea,
  phone_hash text,
  address_line1_ciphertext bytea,
  address_line2_ciphertext bytea,
  city_ciphertext bytea,
  state_region_ciphertext bytea,
  postal_code_ciphertext bytea,
  country_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applicants_email_hash_unique unique (email_hash)
);
comment on table public.applicants is 'Stores personally identifiable applicant records with pgcrypto-protected fields.';
comment on column public.applicants.legal_name_ciphertext is 'Encrypted full legal name captured from onboarding flows.';
comment on column public.applicants.legal_name_hash is 'Deterministic SHA-256 hash of the normalized legal name for deduplication and unique checks.';
comment on column public.applicants.email_ciphertext is 'Encrypted primary contact email address for the applicant.';
comment on column public.applicants.email_hash is 'Deterministic SHA-256 hash of the lowercase email for lookups without decryption.';
comment on column public.applicants.phone_ciphertext is 'Encrypted phone number (optional).';
comment on column public.applicants.phone_hash is 'Deterministic SHA-256 hash of the normalized phone number to support uniqueness validation.';
comment on column public.applicants.country_code is 'ISO 3166-1 alpha-2 country code stored in clear text for reporting segmentation.';
comment on column public.applicants.metadata is 'Arbitrary JSON blob for workflow integrations (non-sensitive).';

create index if not exists applicants_user_id_idx on public.applicants (user_id);
create index if not exists applicants_email_hash_idx on public.applicants (email_hash);
create index if not exists applicants_phone_hash_idx on public.applicants (phone_hash);

create trigger set_timestamp_applicants
  before update on public.applicants
  for each row
  execute function public.set_current_timestamp();

-- Pivot table between trademark applications and applicants
create table if not exists public.trademark_applicants (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.trademark_applications(id) on delete cascade,
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  role text not null default 'primary',
  is_primary boolean not null default false,
  contact_order integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trademark_applicants_unique_applicant unique (application_id, applicant_id)
);
comment on table public.trademark_applicants is 'Associates applications with one or more applicants and captures their workflow role.';
comment on column public.trademark_applicants.role is 'Business-defined applicant role (e.g., primary, co-owner, attorney-of-record).';
comment on column public.trademark_applicants.is_primary is 'Indicates whether this applicant is the primary contact for the filing.';
comment on column public.trademark_applicants.contact_order is 'Optional ordering hint for UI presentation.';

create index if not exists trademark_applicants_application_idx on public.trademark_applicants (application_id);
create index if not exists trademark_applicants_applicant_idx on public.trademark_applicants (applicant_id);
create index if not exists trademark_applicants_role_idx on public.trademark_applicants (role);
create unique index if not exists trademark_applicants_primary_unique on public.trademark_applicants (application_id)
  where is_primary;

create trigger set_timestamp_trademark_applicants
  before update on public.trademark_applicants
  for each row
  execute function public.set_current_timestamp();

-- Row level security policies for applicants
alter table public.applicants enable row level security;

drop policy if exists "Users manage their applicant profile" on public.applicants;
create policy "Users manage their applicant profile"
  on public.applicants
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert or update their applicant profile" on public.applicants;
create policy "Users insert or update their applicant profile"
  on public.applicants
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins manage all applicants" on public.applicants;
create policy "Admins manage all applicants"
  on public.applicants
  for all
  using (public.is_admin_context())
  with check (public.is_admin_context());

-- Row level security policies for trademark_applicants
alter table public.trademark_applicants enable row level security;

drop policy if exists "Users view applicant links for their applications" on public.trademark_applicants;
create policy "Users view applicant links for their applications"
  on public.trademark_applicants
  for select
  using (
    exists (
      select 1
      from public.trademark_applications ta
      where ta.id = application_id
        and ta.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage applicant links for their applications" on public.trademark_applicants;
create policy "Users manage applicant links for their applications"
  on public.trademark_applicants
  for all
  using (
    exists (
      select 1
      from public.trademark_applications ta
      where ta.id = application_id
        and ta.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.trademark_applications ta
      where ta.id = application_id
        and ta.user_id = auth.uid()
    )
  );

drop policy if exists "Admins manage all applicant links" on public.trademark_applicants;
create policy "Admins manage all applicant links"
  on public.trademark_applicants
  for all
  using (public.is_admin_context())
  with check (public.is_admin_context());