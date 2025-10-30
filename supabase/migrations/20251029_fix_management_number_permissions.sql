-- 트리거 함수의 권한 문제를 해결하기 위한 추가 설정

-- SECURITY DEFINER로 함수를 재생성하여 권한 문제 해결
CREATE OR REPLACE FUNCTION generate_management_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- 함수 생성자의 권한으로 실행
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
EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생 시 기본값 반환
    RAISE WARNING 'Error in generate_management_number: %', SQLERRM;
    RETURN 'T' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '999';
END;
$$;

-- Trigger function도 SECURITY DEFINER로 재생성
CREATE OR REPLACE FUNCTION set_management_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  -- 함수 생성자의 권한으로 실행
AS $$
BEGIN
  -- Only set management_number if it's not already provided
  IF NEW.management_number IS NULL THEN
    NEW.management_number := generate_management_number();
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 에러 발생 시 로그 남기고 계속 진행
    RAISE WARNING 'Error in set_management_number: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_management_number() TO authenticated;
GRANT EXECUTE ON FUNCTION set_management_number() TO authenticated;

-- 트리거 재생성
DROP TRIGGER IF EXISTS trigger_set_management_number ON trademark_requests;
CREATE TRIGGER trigger_set_management_number
  BEFORE INSERT ON trademark_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_management_number();
