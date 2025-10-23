import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabaseServerClient";
import ApplicantFormClient from "./ApplicantFormClient";

export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect(`/login?redirect=${encodeURIComponent(`/mypage/requests/${id}/applicant`)}`);
  }

  // Preload existing value if any
  let preset: any = null;
  try {
    const { data: rows } = await supabase
      .from("trademark_request_applicants")
      .select("*")
      .eq("request_id", id)
      .eq("user_id", data.user.id)
      .limit(1);
    if (rows && rows.length) {
      const a = rows[0] as Record<string, any>;
      preset = {
        name: a.name ?? "",
        email: a.email ?? "",
        phone: a.phone ?? "",
        address: a.address ?? "",
        businessType: a.business_type ?? "",
        businessNo: a.business_no ?? "",
      };
    }
  } catch {
    // ignore
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-500">마이페이지</p>
          <h1 className="text-3xl font-semibold text-slate-900">출원인 정보 입력</h1>
          <p className="text-sm text-slate-600">결제 완료 후 출원 절차를 위해 출원인 정보를 입력해 주세요.</p>
        </div>
        <Link href="/mypage" className="text-sm text-slate-600 underline">마이페이지로</Link>
      </div>

      <ApplicantFormClient requestId={id} preset={preset ?? undefined} />
    </div>
  );
}

