import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./supabaseConfig";

export function createBrowserClient() {
  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}
