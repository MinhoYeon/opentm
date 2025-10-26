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

  console.log("[MyPageLayout] Server component - getUser result:", {
    hasUser: !!data?.user,
    userId: data?.user?.id,
    error: error?.message,
    errorStatus: error?.status
  });

  if (error && error.status !== 400) {
    console.error("Failed to verify Supabase user on server", error);
  }

  if (!data?.user) {
    console.log("[MyPageLayout] No user found, redirecting to login");
    redirect(`/login?redirect=${encodeURIComponent("/mypage")}`);
  }

  return <>{children}</>;

}

