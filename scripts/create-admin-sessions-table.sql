-- Admin Sessions Table Setup
-- 이 스크립트는 admin_sessions 테이블을 생성합니다.
-- Supabase Dashboard → SQL Editor에서 실행하세요.

-- Step 1: pgcrypto 확장 활성화 (해시 함수 사용을 위해)
create extension if not exists pgcrypto;

-- Step 2: updated_at 자동 업데이트 함수 생성
create or replace function public.set_current_timestamp_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Step 3: admin_sessions 테이블 생성
create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  session_hash text not null unique,
  is_revoked boolean not null default false,
  mfa_verified_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Step 4: 인덱스 생성 (성능 향상)
create index if not exists admin_sessions_user_id_idx on public.admin_sessions(user_id);
create index if not exists admin_sessions_session_hash_idx on public.admin_sessions(session_hash);
create index if not exists admin_sessions_last_seen_at_idx on public.admin_sessions(last_seen_at desc);

-- Step 5: updated_at 자동 업데이트 트리거 생성
do $$
begin
  if not exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'admin_sessions_set_updated_at'
      and n.nspname = 'public'
      and c.relname = 'admin_sessions'
  ) then
    create trigger admin_sessions_set_updated_at
      before update on public.admin_sessions
      for each row
      execute function public.set_current_timestamp_updated_at();
  end if;
end $$;

-- Step 6: Row Level Security (RLS) 활성화
alter table public.admin_sessions enable row level security;

-- Step 7: Service Role 정책 생성 (서버에서만 접근 가능)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_sessions'
      and policyname = 'Service role manage admin sessions'
  ) then
    create policy "Service role manage admin sessions"
      on public.admin_sessions for all
      using (auth.role() = 'service_role')
      with check (auth.role() = 'service_role');
  end if;
end $$;

-- 완료! 테이블이 생성되었습니다.
-- 확인 쿼리:
-- SELECT * FROM public.admin_sessions;
