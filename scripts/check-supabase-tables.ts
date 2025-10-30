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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
  console.log('🔍 Checking Supabase tables...\n');

  // Query to get all tables in public schema
  const { data: tables, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });

  if (error) {
    // Try alternative method using direct query
    console.log('Trying alternative method...\n');

    const { data: tableList, error: queryError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');

    if (queryError) {
      console.error('❌ Error fetching tables:', queryError.message);
      console.log('\n💡 Alternative: Run this SQL query in Supabase SQL Editor:');
      console.log(`
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
      `);
      return;
    }

    if (tableList && tableList.length > 0) {
      console.log(`✅ Found ${tableList.length} tables in public schema:\n`);
      tableList.forEach((table: any, index: number) => {
        console.log(`${index + 1}. ${table.table_name}`);
      });
    } else {
      console.log('No tables found in public schema');
    }
    return;
  }

  if (tables && tables.length > 0) {
    console.log(`✅ Found ${tables.length} tables in public schema:\n`);
    tables.forEach((table: any, index: number) => {
      console.log(`${index + 1}. ${table.table_name} (${table.column_count} columns)`);
    });
  } else {
    console.log('No tables found in public schema');
  }
}

async function getTableDetails(tableName: string) {
  console.log(`\n📋 Columns in ${tableName}:`);

  const { data: columns, error } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `
    });

  if (error) {
    console.error(`❌ Error fetching columns for ${tableName}:`, error.message);
    return;
  }

  if (columns && columns.length > 0) {
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
  }
}

checkTables().catch(console.error);
