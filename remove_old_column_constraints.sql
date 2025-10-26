-- Remove NOT NULL constraints from old columns to allow new schema to work

-- Remove NOT NULL from old encryption columns
ALTER TABLE public.applicants ALTER COLUMN legal_name_ciphertext DROP NOT NULL;
ALTER TABLE public.applicants ALTER COLUMN legal_name_hash DROP NOT NULL;
ALTER TABLE public.applicants ALTER COLUMN email_ciphertext DROP NOT NULL;
ALTER TABLE public.applicants ALTER COLUMN email_hash DROP NOT NULL;

-- Set defaults for old columns to empty values
ALTER TABLE public.applicants ALTER COLUMN legal_name_ciphertext SET DEFAULT ''::bytea;
ALTER TABLE public.applicants ALTER COLUMN legal_name_hash SET DEFAULT '';
ALTER TABLE public.applicants ALTER COLUMN email_ciphertext SET DEFAULT ''::bytea;
ALTER TABLE public.applicants ALTER COLUMN email_hash SET DEFAULT '';

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'applicants'
  AND column_name IN (
    'legal_name_ciphertext',
    'legal_name_hash',
    'email_ciphertext',
    'email_hash',
    'display_name',
    'email'
  )
ORDER BY column_name;
