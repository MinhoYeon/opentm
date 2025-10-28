#!/usr/bin/env tsx
/**
 * Seed script to create test trademark applications
 *
 * Usage: tsx scripts/seed-trademark-applications.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const testApplications = [
  {
    brand_name: '코드라인',
    trademark_type: 'word',
    product_classes: ['9', '42'],
    goods_description: '소프트웨어 개발 및 컨설팅 서비스',
    status: 'awaiting_payment',
    status_detail: '결제 대기 중입니다',
    payment_amount: 350000,
    payment_currency: 'KRW',
    payment_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    brand_name: '클라우드팩토리',
    trademark_type: 'word',
    product_classes: ['35', '42'],
    goods_description: '클라우드 서비스 및 IT 컨설팅',
    status: 'preparing_filing',
    status_detail: '서류 검토 중',
    payment_amount: 400000,
    payment_currency: 'KRW',
    payment_received_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    brand_name: '스마트비즈',
    trademark_type: 'word',
    product_classes: ['35', '36'],
    goods_description: '경영 컨설팅 및 금융 서비스',
    status: 'filed',
    status_detail: '특허청 제출 완료',
    payment_amount: 380000,
    payment_currency: 'KRW',
    payment_received_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    filed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    filing_receipt_number: '40-2024-0123456',
  },
  {
    brand_name: '에코라이프',
    trademark_type: 'word',
    product_classes: ['3', '5', '21'],
    goods_description: '친환경 생활용품 제조 및 판매',
    status: 'awaiting_payment',
    status_detail: '입금 확인 필요',
    payment_amount: 500000,
    payment_currency: 'KRW',
    payment_due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    brand_name: '헬스케어플러스',
    trademark_type: 'word',
    product_classes: ['10', '44'],
    goods_description: '의료기기 및 의료 서비스',
    status: 'payment_received',
    status_detail: '입금 확인됨',
    payment_amount: 420000,
    payment_currency: 'KRW',
    payment_received_at: new Date().toISOString(),
  },
];

async function main() {
  console.log('🌱 Starting trademark applications seed...\n');

  // Get the first admin user
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError || !users.users || users.users.length === 0) {
    console.error('❌ No users found. Please create an admin user first.');
    process.exit(1);
  }

  const firstUser = users.users[0];
  console.log(`📝 Using user: ${firstUser.email} (${firstUser.id})\n`);

  // Check existing applications
  const { count: existingCount } = await supabase
    .from('trademark_applications')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Existing trademark applications: ${existingCount ?? 0}\n`);

  // Insert test applications
  const applicationsToInsert = testApplications.map(app => ({
    ...app,
    user_id: firstUser.id,
    status_updated_at: new Date().toISOString(),
    metadata: {
      seed: true,
      created_by_script: 'seed-trademark-applications.ts',
      created_at: new Date().toISOString(),
    },
  }));

  const { data: inserted, error: insertError } = await supabase
    .from('trademark_applications')
    .insert(applicationsToInsert)
    .select();

  if (insertError) {
    console.error('❌ Error inserting applications:', insertError);
    process.exit(1);
  }

  console.log(`✅ Successfully inserted ${inserted?.length ?? 0} trademark applications:\n`);

  if (inserted) {
    for (const app of inserted) {
      console.log(`  - ${app.brand_name} (${app.management_number})`);
      console.log(`    Status: ${app.status}`);
      console.log(`    Classes: ${app.product_classes.join(', ')}`);
      console.log('');

      // Create status log for each application
      await supabase.from('trademark_status_logs').insert({
        application_id: app.id,
        from_status: null,
        to_status: app.status,
        changed_by: firstUser.id,
        note: '테스트 데이터 생성',
        metadata: { seed: true },
      });
    }
  }

  console.log('🎉 Seed completed successfully!');
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
