import Link from "next/link";
import { notFound } from "next/navigation";

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

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient();

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    notFound();
  }

  const { id } = await params;

  const { data: row, error } = await supabase
    .from("trademark_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !row) {
    notFound();
  }

  const record = row as Record<string, any>;

  const brandName: string = record.brand_name ?? record.brandName ?? "-";
  const trademarkType: string = record.trademark_type ?? record.trademarkType ?? "-";
  const productClasses: string[] = toStringArray(record.product_classes ?? record.classes);
  const representativeEmail: string = record.representative_email ?? record.representative ?? "-";
  const additionalNotes: string | null = record.additional_notes ?? record.notes ?? null;
  const imageUrl: string | null = record.image_url ?? null;
  const submittedAt: string | null = record.submitted_at ?? record.submittedAt ?? record.created_at ?? null;
  const lastUpdated: string | null = record.updated_at ?? record.status_updated_at ?? record.lastUpdated ?? null;
  const status: string = record.status ?? "unknown";
  const statusLabel: string | null = record.status_label ?? record.statusLabel ?? null;
  const statusDescription: string | null = record.status_description ?? record.status_detail ?? null;
  const referenceCode: string | null = record.reference_code ?? record.id ?? null;
  const transitions: StatusTransition[] = Array.isArray(record.status_transitions)
    ? (record.status_transitions as StatusTransition[])
    : [];

  const statusMeta = getStatusMeta(status);

  // Try to load applicant info for this request
  let applicant: null | { name?: string; email?: string; phone?: string; address?: string; businessType?: string; businessNo?: string } = null;
  try {
    const { data: arows } = await supabase
      .from("trademark_request_applicants")
      .select("name,email,phone,address,business_type,business_no")
      .eq("request_id", id)
      .eq("user_id", userId)
      .limit(1);
    if (arows && arows.length) {
      const a = arows[0] as Record<string, any>;
      applicant = {
        name: a.name ?? undefined,
        email: a.email ?? undefined,
        phone: a.phone ?? undefined,
        address: a.address ?? undefined,
        businessType: a.business_type ?? undefined,
        businessNo: a.business_no ?? undefined,
      };
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
            <h2 className="text-lg font-semibold text-slate-900">출원인 정보</h2>
            {applicant ? (
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">이름</dt><dd className="text-slate-800">{applicant.name}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">이메일</dt><dd className="text-slate-800">{applicant.email}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">전화</dt><dd className="text-slate-800">{applicant.phone ?? '-'}</dd></div>
                <div className="flex gap-2 sm:col-span-2"><dt className="w-28 shrink-0 text-slate-500">주소</dt><dd className="text-slate-800">{applicant.address ?? '-'}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">구분</dt><dd className="text-slate-800">{applicant.businessType ?? '-'}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 text-slate-500">사업자번호</dt><dd className="text-slate-800">{applicant.businessNo ?? '-'}</dd></div>
              </dl>
            ) : (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>아직 출원인 정보가 입력되지 않았습니다.</p>
                <Link href={`/mypage/requests/${id}/applicant`} className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-600">출원인 정보 입력</Link>
              </div>
            )}
          </section>

          {transitions.length ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">상태 이력</h2>
              <ol className="mt-4 space-y-3 text-sm text-slate-700">
                {transitions.map((t, i) => (
                  <li key={i} className="flex flex-col">
                    <span className="font-medium">{t.label ?? t.status}</span>
                    {t.description ? <span>{t.description}</span> : null}
                    <span className="text-xs text-slate-500">{formatDateTime(t.changedAt ?? t.changed_at ?? null)}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
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
