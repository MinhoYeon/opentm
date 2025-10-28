#!/usr/bin/env tsx
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      if (key && valueParts.length > 0) {
        let value = valueParts.join("=").trim();
        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key.trim()] = value;
      }
    }
  });
} catch (err) {
  console.warn("Could not load .env.local:", err);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables:");
  console.error("SUPABASE_URL:", !!supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function checkAdminSessionsTable() {
  console.log("🔍 Checking admin_sessions table...\n");

  // Try to query the table
  const { data, error, count } = await supabase
    .from("admin_sessions")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("❌ Error querying admin_sessions table:");
    console.error(JSON.stringify(error, null, 2));
    console.error("\nPossible causes:");
    console.error("1. Table does not exist - migration not applied");
    console.error("2. RLS policy blocking access");
    console.error("3. Wrong service role key");
    return false;
  }

  console.log("✅ admin_sessions table exists!");
  console.log(`   Current row count: ${count ?? 0}`);

  // Try to get table structure from information_schema
  const { data: columns, error: columnsError } = await supabase.rpc(
    "get_table_columns",
    { table_name: "admin_sessions" }
  ).catch(() => ({ data: null, error: null }));

  if (!columnsError && columns) {
    console.log("\n📋 Table structure:");
    console.log(JSON.stringify(columns, null, 2));
  }

  // Try a test insert and rollback (simulated by immediate delete)
  console.log("\n🧪 Testing insert operation...");
  const testPayload = {
    user_id: "00000000-0000-0000-0000-000000000000",
    session_hash: `test_${Date.now()}`,
    last_seen_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from("admin_sessions")
    .insert(testPayload)
    .select()
    .single();

  if (insertError) {
    console.error("❌ Test insert failed:");
    console.error(JSON.stringify(insertError, null, 2));
    return false;
  }

  console.log("✅ Test insert successful!");
  console.log("   Inserted data:", JSON.stringify(inserted, null, 2));

  // Clean up test data
  if (inserted?.id) {
    await supabase.from("admin_sessions").delete().eq("id", inserted.id);
    console.log("🧹 Cleaned up test data");
  }

  return true;
}

checkAdminSessionsTable()
  .then((success) => {
    console.log("\n" + "=".repeat(50));
    if (success) {
      console.log("✅ All checks passed! The table is working correctly.");
    } else {
      console.log("❌ Checks failed. Please review the errors above.");
    }
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error("\n❌ Unexpected error:");
    console.error(err);
    process.exit(1);
  });
