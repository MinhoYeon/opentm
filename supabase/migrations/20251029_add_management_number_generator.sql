-- Function to generate management number in format: T+YYMMDD+XXX
-- Example: T250101001, T250101002, etc.
CREATE OR REPLACE FUNCTION generate_management_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  today_date TEXT;
  last_sequence INT;
  new_sequence TEXT;
  management_number TEXT;
BEGIN
  -- Get today's date in YYMMDD format
  today_date := TO_CHAR(CURRENT_DATE, 'YYMMDD');

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

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_set_management_number ON trademark_requests;

-- Create trigger to auto-generate management number
CREATE TRIGGER trigger_set_management_number
  BEFORE INSERT ON trademark_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_management_number();

-- Add comment
COMMENT ON FUNCTION generate_management_number() IS 'Generates a unique management number in format T+YYMMDD+XXX';
COMMENT ON FUNCTION set_management_number() IS 'Trigger function to auto-assign management number on insert';
