-- Defensive patch to reconcile column name differences and add missing columns
-- Particularly handles image_path -> image_storage_path rename safely.

do $$
declare
  has_table boolean;
  has_image_storage_path boolean;
  has_image_path boolean;
  has_product_classes boolean;
  has_representative_email boolean;
  has_additional_notes boolean;
  has_submitted_at boolean;
  has_status boolean;
  has_status_detail boolean;
  has_status_updated_at boolean;
begin
  select to_regclass('public.trademark_requests') is not null into has_table;
  if not has_table then
    raise notice 'Table public.trademark_requests does not exist; nothing to patch.';
    return;
  end if;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='trademark_requests' and column_name='image_storage_path'
  ) into has_image_storage_path;

  select exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='trademark_requests' and column_name='image_path'
  ) into has_image_path;

  if not has_image_storage_path then
    if has_image_path then
      execute 'alter table public.trademark_requests rename column image_path to image_storage_path';
      raise notice 'Renamed column image_path -> image_storage_path';
    else
      execute 'alter table public.trademark_requests add column image_storage_path text';
      raise notice 'Added column image_storage_path (text)';
    end if;
  end if;

  -- Ensure product_classes exists and is text[] with default
  select exists(
    select 1 from information_schema.columns where table_schema='public' and table_name='trademark_requests' and column_name='product_classes'
  ) into has_product_classes;
  if not has_product_classes then
    execute 'alter table public.trademark_requests add column product_classes text[] default ''{}''::text[]';
  else
    -- set default if missing
    if not exists (
      select 1 from pg_attrdef d
      join pg_class c on c.oid=d.adrelid
      join pg_attribute a on a.attrelid=c.oid and a.attnum=d.adnum
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname='trademark_requests' and a.attname='product_classes'
    ) then
      execute 'alter table public.trademark_requests alter column product_classes set default ''{}''::text[]';
    end if;
  end if;

  -- Ensure basic columns exist
  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='trademark_requests' and column_name='representative_email') into has_representative_email;
  if not has_representative_email then
    execute 'alter table public.trademark_requests add column representative_email text';
  end if;

  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='trademark_requests' and column_name='additional_notes') into has_additional_notes;
  if not has_additional_notes then
    execute 'alter table public.trademark_requests add column additional_notes text';
  end if;

  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='trademark_requests' and column_name='submitted_at') into has_submitted_at;
  if not has_submitted_at then
    execute 'alter table public.trademark_requests add column submitted_at timestamptz default now()';
  end if;

  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='trademark_requests' and column_name='status') into has_status;
  if not has_status then
    execute 'alter table public.trademark_requests add column status text default ''submitted''';
  end if;

  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='trademark_requests' and column_name='status_detail') into has_status_detail;
  if not has_status_detail then
    execute 'alter table public.trademark_requests add column status_detail text';
  end if;

  select exists(select 1 from information_schema.columns where table_schema='public' and table_name='trademark_requests' and column_name='status_updated_at') into has_status_updated_at;
  if not has_status_updated_at then
    execute 'alter table public.trademark_requests add column status_updated_at timestamptz default now()';
  end if;
end $$;

