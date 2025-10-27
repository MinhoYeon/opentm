#!/usr/bin/env tsx
/**
 * 관리자 역할 설정 스크립트
 *
 * 사용법:
 *   npm run set-admin <email> <role>
 *
 * 예시:
 *   npm run set-admin user@example.com super_admin
 *   npm run set-admin user@example.com operations_admin
 */

import { createClient } from '@supabase/supabase-js';

// Supabase Admin 클라이언트 생성 (service_role 키 필요)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('필요한 환경 변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const VALID_ROLES = ['super_admin', 'operations_admin', 'finance_admin', 'support_admin'];

async function setAdminRole(email: string, role: string) {
  console.log(`\n🔍 사용자 검색 중: ${email}`);

  // 1. 이메일로 사용자 찾기
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('❌ 사용자 목록 조회 실패:', listError.message);
    return;
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error(`❌ 사용자를 찾을 수 없습니다: ${email}`);
    return;
  }

  console.log(`✅ 사용자 발견: ${user.email} (ID: ${user.id})`);

  // 2. app_metadata 업데이트
  console.log(`\n🔧 관리자 역할 설정 중: ${role}`);

  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      app_metadata: {
        ...user.app_metadata,
        role: role,
        is_admin: true
      }
    }
  );

  if (error) {
    console.error('❌ 역할 설정 실패:', error.message);
    return;
  }

  console.log(`✅ 관리자 역할 설정 완료!`);
  console.log(`\n📋 업데이트된 메타데이터:`);
  console.log(JSON.stringify(data.user.app_metadata, null, 2));
  console.log(`\n✨ ${email} 계정이 ${role} 역할로 설정되었습니다.`);
}

// 메인 실행
const email = process.argv[2];
const role = process.argv[3] || 'super_admin';

if (!email) {
  console.error('❌ 사용법: npm run set-admin <email> <role>');
  console.error(`\n유효한 역할: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

if (!VALID_ROLES.includes(role)) {
  console.error(`❌ 유효하지 않은 역할: ${role}`);
  console.error(`유효한 역할: ${VALID_ROLES.join(', ')}`);
  process.exit(1);
}

setAdminRole(email, role).catch(console.error);
