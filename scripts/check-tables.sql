-- Supabase 테이블 확인 쿼리
-- 이 파일을 Supabase SQL Editor에 복사해서 실행하세요

-- 1. 모든 public 테이블 목록
SELECT
  tablename as "테이블명",
  tableowner as "소유자"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. 테이블 상세 정보 (컬럼 수, 크기)
SELECT
  t.tablename as "테이블명",
  (SELECT COUNT(*)
   FROM information_schema.columns
   WHERE table_schema = 'public'
   AND table_name = t.tablename) as "컬럼수",
  pg_size_pretty(pg_total_relation_size(quote_ident(t.tablename)::regclass)) as "디스크크기"
FROM pg_tables t
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- 3. 각 테이블의 행 개수
SELECT
  tablename as "테이블명",
  n_live_tup as "행개수"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. 마이그레이션 파일과 비교 (예상 테이블 목록)
-- 다음 테이블들이 있어야 합니다:
/*
Expected tables:
- trademark_requests
- trademark_applications
- trademark_status_logs
- trademark_payments
- trademark_applicants (사용안함)
- trademark_request_applicants
- applicants
- profiles
- payment_intents
- payment_events
- payments (사용안함)
- bank_transfer_confirmations
- admin_sessions
- refund_requests (사용안함)
- address_search_logs
*/
