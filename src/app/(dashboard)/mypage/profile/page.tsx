import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabaseServerClient";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage/profile")}`);
  }

  return <ProfileClient email={data.user.email ?? null} />;
}

