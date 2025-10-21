import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { createServerClient } from "@/lib/supabaseServerClient";

export default async function MyPageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error("Failed to load Supabase session on server", error);
  }

  if (!session) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage")}`);
  }

  return <>{children}</>;
}