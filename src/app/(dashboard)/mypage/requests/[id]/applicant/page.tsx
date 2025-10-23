import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerClient } from "@/lib/supabaseServerClient";
import { ApplicantSelector } from "@/components/applicants/ApplicantSelector";
import { listApplicants } from "@/server/db/applicants";

type ApplicantParams = { id: string };

type ApplicantSelectionItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  phoneMasked: string | null;
  address: string | null;
  addressMasked: string | null;
  businessType: string | null;
  businessNumber: string | null;
  businessNumberMasked: string | null;
  isFavorite: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export default async function ApplicantPage({ params }: { params: Promise<ApplicantParams> | ApplicantParams }) {
  const resolvedParams = isPromise<ApplicantParams>(params) ? await params : params;
  const { id } = resolvedParams;
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect(`/login?redirect=${encodeURIComponent(`/mypage/requests/${id}/applicant`)}`);
  }

  const { data: requestRow, error: requestError } = await supabase
    .from("trademark_requests")
    .select("id")
    .eq("id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (requestError || !requestRow) {
    redirect("/mypage");
  }

  const applicants = await listApplicants(supabase, data.user.id, { sort: "recent", limit: 50 });

  const initialApplicants: ApplicantSelectionItem[] = applicants.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    phone: item.phone,
    phoneMasked: item.phoneMasked,
    address: item.address,
    addressMasked: item.addressMasked,
    businessType: item.businessType,
    businessNumber: item.businessNumber,
    businessNumberMasked: item.businessNumberMasked,
    isFavorite: item.isFavorite,
    lastUsedAt: item.lastUsedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  const { data: selectedRow } = await supabase
    .from("trademark_request_applicants")
    .select("applicant_id")
    .eq("request_id", id)
    .eq("user_id", data.user.id)
    .maybeSingle();

  const selectedApplicantId = selectedRow?.applicant_id ? String(selectedRow.applicant_id) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-500">마이페이지</p>
          <h1 className="text-3xl font-semibold text-slate-900">출원인 선택</h1>
          <p className="text-sm text-slate-600">
            저장된 출원인을 선택하거나 새로운 출원인을 등록해 상표 출원 요청과 연결해 주세요.
          </p>
        </div>
        <Link href="/mypage" className="text-sm text-slate-600 underline">
          마이페이지로
        </Link>
      </div>

      <ApplicantSelector
        requestId={id}
        initialApplicants={initialApplicants}
        initialSelectedId={selectedApplicantId}
      />
    </div>
  );
}

