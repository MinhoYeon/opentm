import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusTimeline } from "@/components/mypage/StatusTimeline";
import { createServerClient } from "@/lib/supabaseServerClient";

type StatusTransition = {
  status: string;
  label?: string | null;
  description?: string | null;
  changed_at?: string | null;
  changedAt?: string | null;
};

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : String(v)))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((v) => (typeof v === "string" ? v : String(v)))
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value as string;
  }
}

function getStatusMeta(status: string) {
  const map: Record<string, { label: string; description: string }> = {
    draft: { label: "임시 저장", description: "출원 준비 상태입니다." },
    submitted: { label: "제출 완료", description: "요청이 접수되었습니다." },
    review: { label: "검토중", description: "담당 변리사가 검토중입니다." },
    waiting: { label: "대기", description: "추가 확인을 기다리고 있습니다." },
    filed: { label: "출원 완료", description: "특허청에 출원되었습니다." },
    completed: { label: "완료", description: "등록 절차가 완료되었습니다." },
    default: { label: status || "알 수 없음", description: "상태 설명이 없습니다." },
  };
  return map[status] ?? map.default;
}

type RequestParams = { id: string };

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export default async function RequestDetail({ params }: { params: Promise<RequestParams> | RequestParams }) {
  const supabase = createServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    notFound();
  }

  const resolvedParams = isPromise<RequestParams>(params) ? await params : params;
  const { id } = resolvedParams;

  const { data: row, error } = await supabase
    .from("trademark_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !row) {
    notFound();
  }

  const record = row as Record<string, unknown>;

  const brandName =
    typeof record.brand_name === "string"
      ? record.brand_name
      : typeof record.brandName === "string"
        ? (record.brandName as string)
        : "-";
  const trademarkType =
    typeof record.trademark_type === "string"
      ? record.trademark_type
      : typeof record.trademarkType === "string"
        ? (record.trademarkType as string)
        : "-";
  const productClasses = toStringArray(
    (record.product_classes as unknown) ?? (record.classes as unknown)
  );
  const representativeEmail =
    typeof record.representative_email === "string"
      ? record.representative_email
      : typeof record.representative === "string"
        ? (record.representative as string)
        : "-";
  const additionalNotes =
    typeof record.additional_notes === "string"
      ? record.additional_notes
      : typeof record.notes === "string"
        ? (record.notes as string)
        : null;
  const imageUrl = typeof record.image_url === "string" ? record.image_url : null;
  const submittedAt =
    typeof record.submitted_at === "string"
      ? record.submitted_at
      : typeof record.submittedAt === "string"
        ? (record.submittedAt as string)
        : typeof record.created_at === "string"
          ? (record.created_at as string)
          : null;
  const lastUpdated =
    typeof record.updated_at === "string"
      ? record.updated_at
      : typeof record.status_updated_at === "string"
        ? (record.status_updated_at as string)
        : typeof record.lastUpdated === "string"
          ? (record.lastUpdated as string)
          : null;
  const status = typeof record.status === "string" ? record.status : "unknown";
  const statusLabel =
    typeof record.status_label === "string"
      ? record.status_label
      : typeof record.statusLabel === "string"
        ? (record.statusLabel as string)
        : null;
  const statusDescription =
    typeof record.status_description === "string"
      ? record.status_description
      : typeof record.status_detail === "string"
        ? (record.status_detail as string)
        : null;
  const referenceCode =
    typeof record.reference_code === "string"
      ? record.reference_code
      : typeof record.id === "string"
        ? (record.id as string)
        : null;
  const transitionsValue =
    record.status_transitions ?? (record as Record<string, unknown>).statusTransitions;
  const transitions: StatusTransition[] = Array.isArray(transitionsValue)
    ? (transitionsValue as StatusTransition[])
    : [];

  const statusMeta = getStatusMeta(status);

  // Try to load all applicants for this request
  type ApplicantInfo = {
    name: string;
    applicantType?: string;
    nationality?: string;
  };
  let applicants: ApplicantInfo[] = [];
  try {
    const { data: arows } = await supabase
      .from("trademark_request_applicants")
      .select(`
        applicant_id,
        applicants (
          name_korean,
          name_english,
          display_name,
          applicant_type,
          nationality
        )
      `)
      .eq("request_id", id)
      .eq("user_id", userId);

    if (arows && arows.length) {
      applicants = arows
        .map((row) => {
          const r = row as Record<string, unknown>;
          if (r.applicants && typeof r.applicants === "object") {
            const a = r.applicants as Record<string, unknown>;
            return {
              name: (typeof a.name_korean === "string" ? a.name_korean : null) ||
                    (typeof a.name_english === "string" ? a.name_english : null) ||
                    (typeof a.display_name === "string" ? a.display_name : null) ||
                    "-",
              applicantType: typeof a.applicant_type === "string" ? a.applicant_type : undefined,
              nationality: typeof a.nationality === "string" ? a.nationality : undefined,
            };
          }
          return null;
        })
        .filter((item): item is ApplicantInfo => item !== null);
    }
  } catch {}

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-500">상표 출원 요청</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">{brandName}</h1>
          <p className="text-sm text-slate-600">{statusLabel ?? statusMeta.label} · {statusDescription ?? statusMeta.description}</p>
        </div>
        <Link
          href="/mypage"
          className="inline-flex items-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          목록으로
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">요청 정보</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 text-slate-500">상표명</dt>
                <dd className="text-slate-800">{brandName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 text-slate-500">상표 유형</dt>
                <dd className="text-slate-800">{trademarkType}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 text-slate-500">상품류</dt>
                <dd className="text-slate-800">{productClasses.length ? productClasses.join(", ") : '-'}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-32 shrink-0 text-slate-500">담당 이메일</dt>
                <dd className="text-slate-800">{representativeEmail}</dd>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <dt className="w-32 shrink-0 text-slate-500">추가 메모</dt>
                <dd className="text-slate-800 whitespace-pre-wrap">{additionalNotes ?? '-'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">출원인 정보</h2>
              <Link
                href={`/mypage/requests/${id}/applicant`}
                className="text-sm text-indigo-600 hover:underline"
              >
                {applicants.length > 0 ? "편집" : "출원인 선택"}
              </Link>
            </div>
            {applicants.length > 0 ? (
              <div className="mt-4 space-y-4">
                {applicants.map((applicant, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="mb-3 font-semibold text-slate-900">출원인 {index + 1}</p>
                    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-slate-500">이름</dt>
                        <dd className="text-slate-800">{applicant.name}</dd>
                      </div>
                      {applicant.applicantType && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-slate-500">구분</dt>
                          <dd className="text-slate-800">
                            {applicant.applicantType === "domestic_individual" ? "국내 자연인" :
                             applicant.applicantType === "domestic_corporation" ? "국내 법인" :
                             applicant.applicantType}
                          </dd>
                        </div>
                      )}
                      {applicant.nationality && (
                        <div className="flex gap-2">
                          <dt className="w-28 shrink-0 text-slate-500">국적</dt>
                          <dd className="text-slate-800">{applicant.nationality}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>아직 출원인 정보가 입력되지 않았습니다.</p>
                <Link href={`/mypage/requests/${id}/applicant`} className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-600">출원인 선택</Link>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">상태 이력</h2>
              <span className="text-xs font-medium text-slate-500">
                {transitions.length ? `${transitions.length}건` : "기록 없음"}
              </span>
            </div>
            <StatusTimeline status={status} statusLogs={transitions} className="mt-6" />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">요약</h3>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">요청 ID</dt>
                <dd className="text-slate-800">{referenceCode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">제출일</dt>
                <dd className="text-slate-800">{formatDateTime(submittedAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">최근 업데이트</dt>
                <dd className="text-slate-800">{formatDateTime(lastUpdated)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">현 상태</dt>
                <dd className="text-slate-800">{statusLabel ?? status}</dd>
              </div>
            </dl>
          </section>

          {imageUrl ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">제출 이미지</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Trademark" className="mx-auto max-h-72 w-auto object-contain" />
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
