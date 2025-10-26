import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

import { supabaseAnonKey, supabaseUrl } from "./supabaseConfig";

type CookiesLike = {
  get(name: string): { value?: string } | undefined;
  set(arg: { name: string; value: string } & CookieOptions): void;
  delete(arg: { name: string } & CookieOptions): void;
};

type CookieAccessMode = "readOnly" | "mutable";

function isMutableCookieStore(store: unknown): store is CookiesLike {
  if (!store || typeof store !== "object") {
    return false;
  }

  const candidate = store as Partial<CookiesLike>;
  return typeof candidate.set === "function" && typeof candidate.delete === "function";
}

let hasWarnedAboutImmutableCookies = false;

async function withMutableCookieStore(
  mode: CookieAccessMode,
  action: (store: CookiesLike) => void,
  operation: "set" | "remove"
) {
  if (mode !== "mutable") {
    return;
  }

  try {
    const store = await cookies();
    if (!isMutableCookieStore(store)) {
      if (process.env.NODE_ENV === "development" && !hasWarnedAboutImmutableCookies) {
        console.warn(
          `Supabase attempted to ${operation} an auth cookie outside a Route Handler or Server Action. ` +
            "This call was ignored."
        );
        hasWarnedAboutImmutableCookies = true;
      }
      return;
    }

    action(store);
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`Failed to ${operation} auth cookie`, error);
    }
  }
}

export function getSupabaseProjectRef(url: string = supabaseUrl): string | undefined {
  try {
    const parsed = new URL(url);
    const [projectRef] = parsed.hostname.split(".");
    return projectRef;
  } catch {
    return undefined;
  }
}

export function getSupabaseAuthCookieBaseName(): string {
  const projectRef = getSupabaseProjectRef();
  return projectRef ? `sb-${projectRef}-auth-token` : "sb-auth-token";
}

export function getSupabaseAuthCookieNames(): [string, string] {
  const base = getSupabaseAuthCookieBaseName();
  return [base, `${base}.0`];
}

export function createServerClient(mode: CookieAccessMode = "readOnly") {
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string) {
        const store = (await cookies()) as unknown as CookiesLike;
        return store.get(name)?.value;
      },
      async set(name: string, value: string, options: CookieOptions) {
        await withMutableCookieStore(mode, (store) => {
          store.set({ name, value, ...options });
        }, "set");
      },
      async remove(name: string, options: CookieOptions) {
        await withMutableCookieStore(mode, (store) => {
          store.delete({ name, ...options });
        }, "remove");
      },
    },
  });
}
