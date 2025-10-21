import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./supabaseConfig";

type CookiesLike = {
  get(name: string): { value?: string } | undefined;
  set(arg: { name: string; value: string } & CookieOptions): void;
  delete(arg: { name: string } & CookieOptions): void;
};

export function createServerClient() {
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string) {
        const store = (await cookies()) as unknown as CookiesLike;
        return store.get(name)?.value;
      },
      async set(name: string, value: string, options: CookieOptions) {
        try {
          const store = (await cookies()) as unknown as CookiesLike;
          store.set({ name, value, ...options });
        } catch (error) {
          console.error("Failed to set auth cookie", error);
        }
      },
      async remove(name: string, options: CookieOptions) {
        try {
          const store = (await cookies()) as unknown as CookiesLike;
          store.delete({ name, ...options });
        } catch (error) {
          console.error("Failed to remove auth cookie", error);
        }
      },
    },
  });
}
