import { redirect } from "next/navigation";

import { NewTrademarkClient } from "./NewTrademarkClient";
import { createServerClient } from "@/lib/supabaseServerClient";

export default async function NewTrademarkPage() {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    redirect(`/login?redirect=${encodeURIComponent("/trademarks/new")}`);
  }

  return <NewTrademarkClient userId={data.user.id} userEmail={data.user.email ?? null} />;
}
