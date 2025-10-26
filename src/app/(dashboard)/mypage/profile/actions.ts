"use server";

import { createServerClient } from "@/lib/supabaseServerClient";
import { createAdminClient } from "@/lib/supabaseAdminClient";

export async function deleteAccount(): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const supabase = createServerClient("mutable");
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) {
      return { ok: false, message: "로그인이 필요합니다." };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return { ok: false, message: error.message };
    }

    // Best-effort sign out to clear cookies
    try {
      await supabase.auth.signOut();
    } catch {}

    // Redirecting is handled on the client after calling this action
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다.";
    return { ok: false, message: msg };
  }
}

