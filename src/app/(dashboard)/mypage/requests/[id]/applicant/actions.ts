"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabaseServerClient";

export type ApplicantInput = {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  businessType?: string | null; // 개인/법인 등
  businessNo?: string | null;
};

export async function saveApplicantInfo(requestId: string, input: ApplicantInput) {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect(`/login?redirect=${encodeURIComponent(`/mypage/requests/${requestId}/applicant`)}`);
  }

  // Ensure the request belongs to the user
  const { data: req, error: reqErr } = await supabase
    .from("trademark_requests")
    .select("id, user_id")
    .eq("id", requestId)
    .eq("user_id", data.user.id)
    .single();
  if (reqErr || !req) {
    throw new Error("요청을 찾을 수 없습니다.");
  }

  const payload = {
    request_id: requestId,
    user_id: data.user.id,
    name: input.name,
    email: input.email,
    phone: input.phone ?? null,
    address: input.address ?? null,
    business_type: input.businessType ?? null,
    business_no: input.businessNo ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error: upsertError } = await supabase
    .from("trademark_request_applicants")
    .upsert(payload, { onConflict: "request_id" });
  if (upsertError) {
    throw upsertError;
  }

  return { ok: true } as const;
}

