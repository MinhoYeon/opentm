-- ============================================================================
-- MANUAL FIX: Trademark Requests Management Number
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to fix the management_number issue
-- ============================================================================

-- Step 1: Check current state
-- ============================================================================
SELECT
  'Current Records' as info,
  COUNT(*) as total_records,
  COUNT(management_number) as with_management_number,
  COUNT(*) - COUNT(management_number) as null_management_numbers,
  COUNT(DISTINCT management_number) as unique_management_numbers
FROM public.trademark_requests;

-- Step 2: Show duplicate or NULL management numbers
-- ============================================================================
SELECT id, management_number, brand_name, submitted_at
FROM public.trademark_requests
WHERE management_number IS NULL
   OR management_number IN (
     SELECT management_number
     FROM public.trademark_requests
     WHERE management_number IS NOT NULL
     GROUP BY management_number
     HAVING COUNT(*) > 1
   )
ORDER BY management_number NULLS FIRST, submitted_at;

-- Step 3: Check if sequence exists
-- ============================================================================
SELECT
  'Sequence Check' as info,
  last_value as current_sequence_value
FROM public.trademark_management_number_seq;

-- Step 4: Drop the unique constraint temporarily
-- ============================================================================
ALTER TABLE public.trademark_requests
  DROP CONSTRAINT IF EXISTS trademark_requests_management_number_key;

-- Step 5: Set NOT NULL to false (allow NULL temporarily)
-- ============================================================================
ALTER TABLE public.trademark_requests
  ALTER COLUMN management_number DROP NOT NULL;

-- Step 6: Set default value for management_number
-- ============================================================================
ALTER TABLE public.trademark_requests
  ALTER COLUMN management_number SET DEFAULT (
    'TM' || to_char(nextval('public.trademark_management_number_seq'), 'FM000000')
  );

-- Step 7: Update ALL existing records to have unique management numbers
-- ============================================================================
DO $$
DECLARE
  rec RECORD;
  new_number TEXT;
BEGIN
  -- Update all records that have NULL or duplicate management_numbers
  FOR rec IN
    SELECT id
    FROM public.trademark_requests
    ORDER BY submitted_at NULLS LAST, id
  LOOP
    -- Generate new management number
    new_number := 'TM' || to_char(nextval('public.trademark_management_number_seq'), 'FM000000');

    -- Update the record
    UPDATE public.trademark_requests
    SET management_number = new_number
    WHERE id = rec.id AND (management_number IS NULL OR management_number NOT LIKE 'TM%');

    RAISE NOTICE 'Updated record % with %', rec.id, new_number;
  END LOOP;
END $$;

-- Step 8: Re-add the unique constraint
-- ============================================================================
ALTER TABLE public.trademark_requests
  ADD CONSTRAINT trademark_requests_management_number_key UNIQUE (management_number);

-- Step 9: Set NOT NULL constraint
-- ============================================================================
ALTER TABLE public.trademark_requests
  ALTER COLUMN management_number SET NOT NULL;

-- Step 10: Verify final state
-- ============================================================================
SELECT
  'Final State' as info,
  COUNT(*) as total_records,
  COUNT(management_number) as with_management_number,
  COUNT(*) - COUNT(management_number) as null_management_numbers,
  COUNT(DISTINCT management_number) as unique_management_numbers,
  MIN(management_number) as min_management_number,
  MAX(management_number) as max_management_number
FROM public.trademark_requests;

-- Step 11: Show all records to verify
-- ============================================================================
SELECT id, management_number, brand_name, status, submitted_at
FROM public.trademark_requests
ORDER BY management_number;

-- ============================================================================
-- End of manual fix
-- ============================================================================
