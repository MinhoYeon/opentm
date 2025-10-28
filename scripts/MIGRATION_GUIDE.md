# Admin Sessions Migration Guide

## 문제 상황

관리자 페이지(/admin/trademarks)에 접근할 때 다음 오류가 발생합니다:
```
관리자 세션을 생성하지 못했습니다.
```

이는 `admin_sessions` 테이블이 데이터베이스에 생성되지 않았기 때문입니다.

## 해결 방법

### 방법 1: Supabase SQL Editor 사용 (권장)

1. Supabase Dashboard에 로그인합니다
   - URL: https://supabase.com/dashboard

2. 프로젝트 선택: `hrnxmpbtytapeozdioyb`

3. 왼쪽 메뉴에서 **SQL Editor** 선택

4. 다음 파일의 내용을 복사하여 붙여넣습니다:
   ```
   scripts/apply-admin-sessions-migration.sql
   ```

5. **RUN** 버튼을 클릭하여 실행

6. 성공 메시지 확인:
   ```
   admin_sessions table created successfully!
   ```

### 방법 2: Supabase CLI 사용 (로컬 개발 환경이 있는 경우)

```bash
# Supabase CLI 설치 (없는 경우)
npm install -g supabase

# 프로젝트 링크
supabase link --project-ref hrnxmpbtytapeozdioyb

# 마이그레이션 실행
supabase db push --include-all
```

### 방법 3: 기존 마이그레이션 파일 실행

기존 마이그레이션 파일을 직접 실행:
```
supabase/migrations/20251201_admin_security_bank_transfer.sql
```

이 파일의 내용을 Supabase SQL Editor에서 실행하면 됩니다.

## 확인 방법

마이그레이션이 성공적으로 실행되었는지 확인하려면:

1. Supabase Dashboard → **Table Editor** 이동
2. `admin_sessions` 테이블이 생성되었는지 확인
3. 테이블 구조 확인:
   - `id` (uuid, primary key)
   - `user_id` (uuid)
   - `session_hash` (text, unique)
   - `is_revoked` (boolean, default: false)
   - `mfa_verified_at` (timestamptz, nullable)
   - `last_seen_at` (timestamptz)
   - `created_at` (timestamptz)
   - `updated_at` (timestamptz)

4. 관리자 페이지(/admin/trademarks)에 다시 접근하여 오류가 해결되었는지 확인

## 추가 정보

- 에러 로깅이 개선되었습니다 (src/lib/api/auth.ts:133-144)
- 이제 더 자세한 에러 메시지가 콘솔에 출력됩니다
- 문제가 계속되면 브라우저 콘솔과 서버 로그를 확인하세요
