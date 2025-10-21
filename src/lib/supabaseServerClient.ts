import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./supabaseConfig";

type CookieStore = ReturnType<typeof cookies>;

export function createServerClient(cookieStore: CookieStore = cookies()) {
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          console.error("Failed to set auth cookie", error);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.delete({ name, ...options });
        } catch (error) {
          console.error("Failed to remove auth cookie", error);
        }
      },
    },
  });
}
