-- Complete fix for applicants table structure
-- This adds the missing display_name and email columns

-- Add display_name column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN display_name text;
    RAISE NOTICE 'Added display_name column';
  END IF;
END $$;

-- Add email column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN email text;
    RAISE NOTICE 'Added email column';
  END IF;
END $$;

-- Migrate data from old columns to new columns if needed
UPDATE public.applicants
SET
  display_name = COALESCE(name_korean, ''),
  email = ''
WHERE display_name IS NULL;

-- Set NOT NULL constraints after data migration
ALTER TABLE public.applicants ALTER COLUMN display_name SET NOT NULL;
ALTER TABLE public.applicants ALTER COLUMN email SET NOT NULL;

-- Add email constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'applicants_email_check'
  ) THEN
    ALTER TABLE public.applicants
      ADD CONSTRAINT applicants_email_check
      CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS applicants_email_idx ON public.applicants (email);
CREATE INDEX IF NOT EXISTS applicants_email_lower_idx ON public.applicants (lower(email));

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'applicants'
  AND column_name IN ('display_name', 'email', 'name_korean', 'applicant_type')
ORDER BY column_name;
