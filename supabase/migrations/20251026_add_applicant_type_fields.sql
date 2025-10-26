-- Add new fields for applicant type distinction (domestic individual vs corporation)

-- Add applicant_type column to distinguish between individual and corporation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'applicant_type'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN applicant_type text;
  END IF;
END $$;

-- Add name_korean column (replaces display_name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'name_korean'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN name_korean text;
  END IF;
END $$;

-- Add name_english column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'name_english'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN name_english text;
  END IF;
END $$;

-- Add nationality column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'nationality'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN nationality text;
  END IF;
END $$;

-- Add resident_registration_number fields (for individuals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'resident_registration_number_secret'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN resident_registration_number_secret jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'resident_registration_number_masked'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN resident_registration_number_masked text;
  END IF;
END $$;

-- Add corporation_registration_number fields (for corporations)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'corporation_registration_number_secret'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN corporation_registration_number_secret jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'corporation_registration_number_masked'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN corporation_registration_number_masked text;
  END IF;
END $$;

-- Rename business_number to business_registration_number for corporations
-- Keep business_number_secret and business_number_masked for backward compatibility
-- Add new columns for clarity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'business_registration_number_secret'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN business_registration_number_secret jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'business_registration_number_masked'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN business_registration_number_masked text;
  END IF;
END $$;

-- Add mobile_phone fields (separate from phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'mobile_phone_secret'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN mobile_phone_secret jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'mobile_phone_masked'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN mobile_phone_masked text;
  END IF;
END $$;

-- Add priority_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'priority_number'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN priority_number text;
  END IF;
END $$;

-- Add delivery_postal_code column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'delivery_postal_code'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN delivery_postal_code text;
  END IF;
END $$;

-- Add delivery_address fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'delivery_address_secret'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN delivery_address_secret jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'delivery_address_masked'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN delivery_address_masked text;
  END IF;
END $$;

-- Add patent_customer_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'applicants'
      AND column_name = 'patent_customer_number'
  ) THEN
    ALTER TABLE public.applicants ADD COLUMN patent_customer_number text;
  END IF;
END $$;

-- Add comments for new fields
COMMENT ON COLUMN public.applicants.applicant_type IS 'Type of applicant: domestic_individual or domestic_corporation';
COMMENT ON COLUMN public.applicants.name_korean IS 'Korean name (성명 for individual, 명칭 for corporation)';
COMMENT ON COLUMN public.applicants.name_english IS 'English name (optional)';
COMMENT ON COLUMN public.applicants.nationality IS 'Nationality (국적)';
COMMENT ON COLUMN public.applicants.resident_registration_number_secret IS 'AES-GCM encrypted resident registration number (주민등록번호)';
COMMENT ON COLUMN public.applicants.corporation_registration_number_secret IS 'AES-GCM encrypted corporation registration number (법인등록번호)';
COMMENT ON COLUMN public.applicants.business_registration_number_secret IS 'AES-GCM encrypted business registration number (사업자등록번호)';
COMMENT ON COLUMN public.applicants.mobile_phone_secret IS 'AES-GCM encrypted mobile phone number (휴대전화번호)';
COMMENT ON COLUMN public.applicants.priority_number IS 'Priority number (우선번호)';
COMMENT ON COLUMN public.applicants.delivery_postal_code IS 'Delivery postal code (송달장의 우편번호)';
COMMENT ON COLUMN public.applicants.delivery_address_secret IS 'AES-GCM encrypted delivery address (송달장소의 주소)';
COMMENT ON COLUMN public.applicants.patent_customer_number IS 'Patent customer number (특허고객번호)';
