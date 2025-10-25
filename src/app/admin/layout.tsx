import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createServerClient } from "@/lib/supabaseServerClient";
import { resolveAdminContext } from "@/lib/admin/roles";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to verify admin session", error);
  }

  if (!data?.user) {
    redirect(`/login?redirect=${encodeURIComponent("/admin/trademarks")}`);
  }

  const adminContext = resolveAdminContext(data.user);
  if (!adminContext) {
    redirect("/");
  }

  return <>{children}</>;
}

