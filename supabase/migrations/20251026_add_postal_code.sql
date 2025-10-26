-- Add postal_code field for residential address postal code

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN postal_code text;
    COMMENT ON COLUMN public.applicants.postal_code IS 'Postal code for residential address (주민등록상 우편번호)';
  END IF;
END $$;

-- Verify the changes
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'applicants'
  AND column_name IN ('postal_code', 'delivery_postal_code', 'address_secret', 'delivery_address_secret')
ORDER BY column_name;
