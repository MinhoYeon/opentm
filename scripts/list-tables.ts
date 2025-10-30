#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function listTables() {
  console.log('🔍 Checking tables in Supabase database...\n');
  console.log(`Connected to: ${supabaseUrl}\n`);

  // List of expected tables based on migrations
  const expectedTables = [
    'trademark_requests',
    'trademark_applications',
    'trademark_status_logs',
    'trademark_payments',
    'trademark_applicants',
    'trademark_request_applicants',
    'applicants',
    'profiles',
    'payment_intents',
    'payment_events',
    'payments',
    'bank_transfer_confirmations',
    'admin_sessions',
    'refund_requests',
    'address_search_logs',
  ];

  console.log('📊 Testing table access:\n');

  for (const tableName of expectedTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        if (error.code === '42P01') {
          console.log(`❌ ${tableName.padEnd(35)} - TABLE DOES NOT EXIST`);
        } else if (error.code === '42501') {
          console.log(`⚠️  ${tableName.padEnd(35)} - EXISTS (no access permission)`);
        } else {
          console.log(`⚠️  ${tableName.padEnd(35)} - ERROR: ${error.message}`);
        }
      } else {
        console.log(`✅ ${tableName.padEnd(35)} - EXISTS (${count ?? 0} rows)`);
      }
    } catch (err: any) {
      console.log(`❌ ${tableName.padEnd(35)} - ERROR: ${err.message}`);
    }
  }

  console.log('\n💡 To see all tables in SQL Editor, run:');
  console.log(`
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
  `);
}

listTables().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
