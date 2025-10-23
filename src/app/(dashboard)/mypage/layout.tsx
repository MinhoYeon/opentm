import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createServerClient } from "@/lib/supabaseServerClient";

export default async function MyPageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    console.error("Failed to verify Supabase user on server", error);
  }

  if (!data?.user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage")}`);
  }

  return <>{children}</>;

}

