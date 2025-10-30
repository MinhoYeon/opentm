-- Fix race condition in management number generation
-- Use advisory lock to prevent duplicate numbers

-- Drop existing functions and trigger
DROP TRIGGER IF EXISTS trigger_set_management_number ON trademark_requests;
DROP FUNCTION IF EXISTS set_management_number();
DROP FUNCTION IF EXISTS generate_management_number();

-- Function to generate management number with advisory lock
-- Format: T+YYMMDD+XXX (Example: T250101001, T250101002)
CREATE OR REPLACE FUNCTION generate_management_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today_date TEXT;
  last_sequence INT;
  new_sequence TEXT;
  management_number TEXT;
  lock_key BIGINT;
BEGIN
  -- Get today's date in YYMMDD format
  today_date := TO_CHAR(CURRENT_DATE, 'YYMMDD');

  -- Create a unique lock key based on today's date
  -- Use hashtext to convert date string to integer for advisory lock
  lock_key := hashtext('management_number_' || today_date);

  -- Acquire advisory lock to prevent race condition
  -- This ensures only one transaction can generate a number at a time
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Find the last sequence number for today
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(management_number FROM 8 FOR 3) AS INT
      )
    ),
    0
  )
  INTO last_sequence
  FROM trademark_requests
  WHERE management_number LIKE 'T' || today_date || '%';

  -- Increment and format with zero-padding
  new_sequence := LPAD((last_sequence + 1)::TEXT, 3, '0');

  -- Construct the management number
  management_number := 'T' || today_date || new_sequence;

  RETURN management_number;

  -- Advisory lock is automatically released at transaction end
END;
$$;

-- Trigger function to auto-assign management number on insert
CREATE OR REPLACE FUNCTION set_management_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set management_number if it's not already provided
  IF NEW.management_number IS NULL THEN
    NEW.management_number := generate_management_number();
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate management number
CREATE TRIGGER trigger_set_management_number
  BEFORE INSERT ON trademark_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_management_number();

-- Add comments
COMMENT ON FUNCTION generate_management_number() IS 'Generates a unique management number in format T+YYMMDD+XXX with advisory lock to prevent race conditions';
COMMENT ON FUNCTION set_management_number() IS 'Trigger function to auto-assign management number on insert';
