-- Fix applicants table: Ensure display_name exists and is properly set up

-- Check and add display_name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN display_name text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Update display_name to NOT NULL if it's nullable
DO $$
BEGIN
  ALTER TABLE public.applicants
    ALTER COLUMN display_name SET NOT NULL;
EXCEPTION WHEN OTHERS THEN
  -- Column might already be NOT NULL, ignore error
  NULL;
END $$;

-- For existing rows, sync display_name with name_korean where needed
UPDATE public.applicants
SET display_name = COALESCE(name_korean, display_name, '')
WHERE display_name IS NULL OR display_name = '';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'applicants'
  AND column_name IN ('display_name', 'name_korean', 'applicant_type')
ORDER BY column_name;
