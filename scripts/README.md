# 관리자 설정 가이드

## 개요

이 문서는 OpenTM 시스템에서 관리자 계정을 설정하는 방법을 설명합니다.

---

## ⚠️ 전제조건: admin_sessions 테이블 생성

**관리자 계정을 사용하기 전에 먼저 `admin_sessions` 테이블을 생성해야 합니다.**

### 에러 증상

`/admin/trademarks` 접속 시 다음 에러가 발생하면 테이블이 없는 것입니다:
```
Could not find the table 'public.admin_sessions' in the schema cache
```

### 해결 방법

1. **Supabase Dashboard 접속**
   - 프로젝트: `https://hrnxmpbtytapeozdioyb.supabase.co`

2. **SQL Editor로 이동**
   - 좌측 메뉴에서 `SQL Editor` 클릭

3. **SQL 스크립트 실행**
   - `scripts/create-admin-sessions-table.sql` 파일의 내용을 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭

4. **결과 확인**
   ```sql
   SELECT * FROM public.admin_sessions;
   ```
   - 에러 없이 빈 결과가 나오면 성공

이제 관리자 계정을 설정할 수 있습니다.

---

## 방법 1: SQL Editor 사용 (가장 빠름)

### 단계

1. **Supabase Dashboard 접속**
   - 프로젝트: `https://hrnxmpbtytapeozdioyb.supabase.co`

2. **SQL Editor로 이동**
   - 좌측 메뉴에서 `SQL Editor` 클릭

3. **SQL 쿼리 실행**

   **이메일로 사용자 찾아서 역할 부여:**
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data =
     COALESCE(raw_app_meta_data, '{}'::jsonb) ||
     '{"role": "super_admin", "is_admin": true}'::jsonb
   WHERE email = 'your-email@example.com';
   ```

   **사용자 ID로 역할 부여:**
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data =
     COALESCE(raw_app_meta_data, '{}'::jsonb) ||
     '{"role": "super_admin", "is_admin": true}'::jsonb
   WHERE id = 'user-uuid-here';
   ```

4. **결과 확인**
   ```sql
   SELECT email, raw_app_meta_data
   FROM auth.users
   WHERE email = 'your-email@example.com';
   ```

---

## 방법 2: 스크립트 사용

### 준비

1. **tsx 설치** (처음 한 번만)
   ```bash
   npm install
   ```

2. **환경 변수 확인**
   - `.env.local` 파일에 다음 변수가 있는지 확인:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`

### 사용법

```bash
npm run set-admin <이메일> <역할>
```

### 예시

```bash
# super_admin 역할 부여
npm run set-admin user@example.com super_admin

# operations_admin 역할 부여
npm run set-admin user@example.com operations_admin

# finance_admin 역할 부여
npm run set-admin user@example.com finance_admin

# support_admin 역할 부여
npm run set-admin user@example.com support_admin
```

---

## 관리자 역할 종류

| 역할 | 권한 |
|------|------|
| `super_admin` | 모든 권한 (상태 관리, 결제 관리, 관리자 관리, 감사 로그, 대량 작업) |
| `operations_admin` | 운영 권한 (상태 관리, 문서 업로드, 대량 작업, 감사 로그 읽기) |
| `finance_admin` | 재무 권한 (결제 관리, 대량 작업) |
| `support_admin` | 지원 권한 (감사 로그 읽기만) |

역할별 세부 권한은 `src/lib/admin/roles.ts` 파일을 참고하세요.

---

## 확인 방법

### 1. 데이터베이스에서 확인

```sql
SELECT
  email,
  raw_app_meta_data->>'role' as role,
  raw_app_meta_data->>'is_admin' as is_admin
FROM auth.users
WHERE email = 'your-email@example.com';
```

### 2. 로그인해서 확인

1. 애플리케이션에 로그인
2. `/admin` 경로로 이동
3. 접근 가능하면 관리자 권한이 정상적으로 설정된 것입니다

---

## 문제 해결

### 문제: "사용자를 찾을 수 없습니다"

**해결:**
- 이메일 주소를 정확히 확인
- Supabase Dashboard → Authentication → Users에서 사용자 목록 확인

### 문제: "환경 변수가 설정되지 않았습니다"

**해결:**
- `.env.local` 파일 확인
- `SUPABASE_SERVICE_ROLE_KEY` 값 확인
- Supabase Dashboard → Settings → API에서 `service_role` 키 복사

### 문제: 로그인 후 `/admin`에 접근할 수 없음

**해결:**
1. 브라우저 캐시/쿠키 삭제
2. 로그아웃 후 다시 로그인
3. 데이터베이스에서 `raw_app_meta_data` 확인

---

## 보안 주의사항

- `SUPABASE_SERVICE_ROLE_KEY`는 절대 Git에 커밋하지 마세요
- 관리자 역할은 신중하게 부여하세요
- `super_admin`과 `operations_admin`은 MFA(다중 인증) 필수입니다
- 정기적으로 관리자 계정을 검토하세요

---

## 관련 파일

- 역할 정의: `src/lib/admin/roles.ts`
- 관리자 인증: `src/lib/api/auth.ts`
- 관리자 레이아웃: `src/app/admin/layout.tsx`
- 로그인 페이지: `src/app/login/page.tsx`
