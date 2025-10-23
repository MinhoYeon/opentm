import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabaseServerClient";
import ApplicantFormClient from "./ApplicantFormClient";

type ApplicantParams = { id: string };

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

type ApplicantPreset = {
  name: string;
  email: string;
  phone: string;
  address: string;
  businessType: string;
  businessNo: string;
};

export default async function ApplicantPage({ params }: { params: Promise<ApplicantParams> | ApplicantParams }) {
  const resolvedParams = isPromise<ApplicantParams>(params) ? await params : params;
  const { id } = resolvedParams;
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect(`/login?redirect=${encodeURIComponent(`/mypage/requests/${id}/applicant`)}`);
  }

  // Preload existing value if any
  let preset: ApplicantPreset | null = null;
  try {
    const { data: rows } = await supabase
      .from("trademark_request_applicants")
      .select("*")
      .eq("request_id", id)
      .eq("user_id", data.user.id)
      .limit(1);
    if (rows && rows.length) {
      const a = rows[0] as Record<string, unknown>;
      preset = {
        name: typeof a.name === "string" ? a.name : "",
        email: typeof a.email === "string" ? a.email : "",
        phone: typeof a.phone === "string" ? a.phone : "",
        address: typeof a.address === "string" ? a.address : "",
        businessType: typeof a.business_type === "string" ? (a.business_type as string) : "",
        businessNo: typeof a.business_no === "string" ? (a.business_no as string) : "",
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

