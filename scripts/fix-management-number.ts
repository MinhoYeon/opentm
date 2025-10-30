#!/usr/bin/env tsx

/**
 * This script fixes the management_number column in trademark_requests table
 * by setting a default value and updating existing NULL values.
 */

import { createAdminClient } from "../src/lib/supabaseAdminClient";

async function main() {
  const supabase = createAdminClient();

  console.log("Checking trademark_requests table...");

  // Check current state
  const { data: existingRequests, error: fetchError } = await supabase
    .from("trademark_requests")
    .select("id, management_number")
    .limit(10);

  if (fetchError) {
    console.error("Error fetching trademark requests:", fetchError);
    process.exit(1);
  }

  console.log("\nCurrent state of first 10 records:");
  console.table(existingRequests);

  // Execute migration SQL
  console.log("\nApplying migration...");

  const migrationSQL = `
    -- Drop the unique constraint temporarily
    ALTER TABLE public.trademark_requests
      DROP CONSTRAINT IF EXISTS trademark_requests_management_number_key;

    -- Set default value for management_number using the existing sequence
    ALTER TABLE public.trademark_requests
      ALTER COLUMN management_number SET DEFAULT (
        'TM' || to_char(nextval('public.trademark_management_number_seq'), 'FM000000')
      );

    -- Re-add the unique constraint (allows NULL values)
    ALTER TABLE public.trademark_requests
      ADD CONSTRAINT trademark_requests_management_number_key UNIQUE (management_number);

    -- Update existing NULL management_numbers with generated values
    UPDATE public.trademark_requests
    SET management_number = 'TM' || to_char(nextval('public.trademark_management_number_seq'), 'FM000000')
    WHERE management_number IS NULL;
  `;

  const { error: migrationError } = await supabase.rpc("exec_sql", {
    sql: migrationSQL,
  });

  if (migrationError) {
    console.error("\nMigration failed via RPC. Trying direct SQL execution...");

    // Try executing each statement separately
    const statements = [
      "ALTER TABLE public.trademark_requests DROP CONSTRAINT IF EXISTS trademark_requests_management_number_key",
      "ALTER TABLE public.trademark_requests ALTER COLUMN management_number SET DEFAULT ('TM' || to_char(nextval('public.trademark_management_number_seq'), 'FM000000'))",
      "ALTER TABLE public.trademark_requests ADD CONSTRAINT trademark_requests_management_number_key UNIQUE (management_number)",
    ];

    for (const sql of statements) {
      console.log(`Executing: ${sql.substring(0, 60)}...`);
      // Note: Supabase JS client doesn't support DDL statements directly
      // This needs to be run via Supabase SQL editor or CLI
    }

    console.log("\n⚠️  Please run the migration SQL manually in Supabase SQL Editor:");
    console.log("\n" + migrationSQL);
  } else {
    console.log("✅ Migration applied successfully!");
  }

  // Update NULL values programmatically
  console.log("\nUpdating NULL management_numbers...");

  const { data: nullRecords, error: nullError } = await supabase
    .from("trademark_requests")
    .select("id")
    .is("management_number", null);

  if (nullError) {
    console.error("Error fetching NULL records:", nullError);
  } else if (nullRecords && nullRecords.length > 0) {
    console.log(`Found ${nullRecords.length} records with NULL management_number`);

    // Update them one by one using a raw SQL query
    for (let i = 0; i < nullRecords.length; i++) {
      const record = nullRecords[i];
      const managementNumber = `TM${String(i + 1).padStart(6, '0')}`;

      const { error: updateError } = await supabase
        .from("trademark_requests")
        .update({ management_number: managementNumber })
        .eq("id", record.id);

      if (updateError) {
        console.error(`Failed to update record ${record.id}:`, updateError);
      } else {
        console.log(`✅ Updated record ${record.id} with ${managementNumber}`);
      }
    }
  } else {
    console.log("No NULL management_numbers found");
  }

  // Verify final state
  const { data: finalState, error: finalError } = await supabase
    .from("trademark_requests")
    .select("id, management_number")
    .limit(10);

  if (finalError) {
    console.error("Error fetching final state:", finalError);
  } else {
    console.log("\nFinal state of first 10 records:");
    console.table(finalState);
  }

  console.log("\n✅ Done!");
}

main().catch(console.error);
