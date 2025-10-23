import { redirect } from "next/navigation";
import Link from "next/link";

import MyPageClient, { TrademarkRequest } from "./MyPageClient";
import { createServerClient } from "@/lib/supabaseServerClient";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type PageSearchParams = {
  page?: string;
};

type PageProps = {
  // Next 15: dynamic APIs like searchParams are async
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

function toPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item)))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item : String(item)))
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      // fall through to comma separated parsing
    }

    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function toStatusTransitions(value: unknown) {
  if (!value) {
    return [];
  }

  const parseObject = (entry: Record<string, unknown>) => ({
    status: String(entry.status ?? "알 수 없음"),
    label: typeof entry.label === "string" ? entry.label : null,
    description: typeof entry.description === "string" ? entry.description : null,
    changedAt:
      typeof entry.changed_at === "string"
        ? entry.changed_at
        : typeof entry.changedAt === "string"
          ? entry.changedAt
          : null,
  });

  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => parseObject(item));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
          .map((item) => parseObject(item));
      }
    } catch {
      return [];
    }
  }

  return [];
}

function resolveDisplayName(user: SupabaseUser) {
  if (user.user_metadata) {
    const { name, full_name: fullName } = user.user_metadata as Record<string, unknown>;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
    if (typeof fullName === "string" && fullName.trim()) {
      return fullName.trim();
    }
  }
  return user.email ?? null;
}

export default async function MyPage({ searchParams }: PageProps) {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  // Treat missing/invalid session as unauthenticated and redirect gracefully.
  if (error || !data?.user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage")}`);
  }

  const sp = typeof (searchParams as any)?.then === "function"
    ? await (searchParams as Promise<PageSearchParams>)
    : ((searchParams as PageSearchParams | undefined) ?? {});
  const page = toPositiveInteger(sp.page, 1);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data: rows, count, error: listError } = await supabase
    .from("trademark_requests")
    .select("*", { count: "exact" })
    .eq("user_id", data.user.id)
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (listError) {
    throw listError;
  }

  const submissions: TrademarkRequest[] = (rows ?? []).map((item) => {
    const record = item as Record<string, unknown>;

    const statusDescription =
      typeof record.status_description === "string"
        ? record.status_description
        : typeof record.statusDescription === "string"
          ? record.statusDescription
          : null;

    return {
      id: String(record.id ?? ""),
      brandName:
        typeof record.brand_name === "string"
          ? record.brand_name
          : typeof record.brandName === "string"
            ? record.brandName
            : "이름 미지정",
      status: typeof record.status === "string" ? record.status : "알 수 없음",
      statusLabel:
        typeof record.status_label === "string"
          ? record.status_label
          : typeof record.statusLabel === "string"
            ? record.statusLabel
            : null,
      statusDescription,
      statusBadgeClass:
        typeof record.status_badge_class === "string"
          ? record.status_badge_class
          : typeof record.statusBadgeClass === "string"
            ? record.statusBadgeClass
            : null,
      statusDotClass:
        typeof record.status_dot_class === "string"
          ? record.status_dot_class
          : typeof record.statusDotClass === "string"
            ? record.statusDotClass
            : null,
      submittedAt:
        typeof record.submitted_at === "string"
          ? record.submitted_at
          : typeof record.submittedAt === "string"
            ? record.submittedAt
            : typeof record.created_at === "string"
              ? record.created_at
              : null,
      lastUpdated:
        typeof record.updated_at === "string"
          ? record.updated_at
          : typeof record.last_updated === "string"
            ? record.last_updated
            : typeof record.lastUpdated === "string"
              ? record.lastUpdated
              : null,
      classes: toStringArray((record as any).product_classes ?? (record as any).classes),
      representative:
        typeof record.representative_name === "string"
          ? record.representative_name
          : typeof record.representative === "string"
            ? record.representative
            : null,
      referenceCode:
        typeof record.reference_code === "string"
          ? record.reference_code
          : typeof record.referenceCode === "string"
            ? record.referenceCode
            : null,
      transitions: toStatusTransitions(record.status_transitions ?? record.statusTransitions),
    } satisfies TrademarkRequest;
  });

  const totalCount = Number.isFinite(count) && typeof count === "number" ? count : submissions.length;

  // 회원정보 카드에 표시할 사용자 기본 정보
  const displayName = resolveDisplayName(data.user);
  const userEmail = data.user.email ?? "-";

  // 출원 과정 안내 단계 텍스트
  const processSteps = [
    "입금대기(가상계좌)",
    "결제완료",
    "출원인 정보 입력완료",
    "출원완료",
    "심사 진행중",
    "등록료 납부대기",
    "등록완료",
  ];

  // 최근 출원인 정보 조회 (있으면 표시)
  let applicant: null | {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    businessType?: string | null;
    businessNo?: string | null;
    requestId?: string | null;
  } = null;
  try {
    const { data: applicantRows } = await supabase
      .from("trademark_request_applicants")
      .select("*")
      .eq("user_id", data.user.id)
      .order("updated_at", { ascending: false })
      .limit(1);
    if (applicantRows && applicantRows.length > 0) {
      const a = applicantRows[0] as Record<string, unknown>;
      applicant = {
        name: typeof a.name === "string" ? a.name : null,
        email: typeof a.email === "string" ? a.email : null,
        phone: typeof a.phone === "string" ? a.phone : null,
        address: typeof a.address === "string" ? a.address : null,
        businessType: typeof a.business_type === "string" ? (a.business_type as string) : null,
        businessNo: typeof a.business_no === "string" ? (a.business_no as string) : null,
        requestId: typeof a.request_id === "string" ? (a.request_id as string) : null,
      };
    }
  } catch {
    // If table doesn't exist or query fails, hide the section gracefully
    applicant = null;
  }

  // Temporary server-side fallbacks for UI text and helpers.
  // Note: The client component renders richer UI; these are safe defaults
  // to prevent runtime reference errors in this server file.
  const heroDescription = submissions.length
    ? "최근 제출한 출원들의 진행 상황을 확인하세요."
    : "아직 제출한 출원 요청이 없습니다.";
  const isLoading = false;
  const isAuthenticated = true;
  const isFetching = false;

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

  const statusStyles: Record<string, { badge: string; dot: string }> = {
    draft: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
    submitted: { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
    review: { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
    waiting: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
    filed: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
    completed: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
    default: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  };

  function getStatusMeta(status: string) {
    const map: Record<string, { label: string; description: string }> = {
      draft: { label: "임시 저장", description: "제출 전 상태입니다." },
      review: { label: "검토 중", description: "담당 변리사가 검토 중입니다." },
      waiting: { label: "대기", description: "추가 확인을 기다리고 있습니다." },
      filed: { label: "출원 완료", description: "특허청에 출원되었습니다." },
      completed: { label: "완료", description: "검토가 완료되었습니다." },
      default: { label: status || "알 수 없음", description: "상태 설명이 없습니다." },
    };
    return map[status] ?? map.default;
  }

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-medium text-indigo-500">내 상표 출원 현황</p>
        <h1 className="text-3xl font-semibold text-slate-900">마이페이지</h1>
        <p className="text-sm text-slate-600">{heroDescription}</p>
      </header>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          접근 권한을 확인하는 중입니다...
        </div>
      ) : null}

      {!isLoading && !isAuthenticated ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          마이페이지는 로그인한 사용자만 이용할 수 있습니다. 로그인 화면으로 이동합니다.
        </div>
      ) : null}

      {isAuthenticated ? (
        <>
          {/* 회원정보 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">회원정보</h2>
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-1">
                <p className="text-base font-medium text-slate-900">{displayName ?? "-"}</p>
                <p className="text-sm text-slate-500">{userEmail}</p>
              </div>
              <Link
                href="/mypage/profile"
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                회원 정보 수정
              </Link>
            </div>
          </section>

          {/* 출원인 정보 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">출원인 정보</h2>
            {applicant ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">이름</dt><dd className="text-slate-800">{applicant.name ?? '-'}</dd></div>
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">이메일</dt><dd className="text-slate-800">{applicant.email ?? '-'}</dd></div>
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">전화</dt><dd className="text-slate-800">{applicant.phone ?? '-'}</dd></div>
                  <div className="flex gap-2 sm:col-span-2"><dt className="w-24 shrink-0 text-slate-500">주소</dt><dd className="text-slate-800">{applicant.address ?? '-'}</dd></div>
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">구분</dt><dd className="text-slate-800">{applicant.businessType ?? '-'}</dd></div>
                  <div className="flex gap-2"><dt className="w-24 shrink-0 text-slate-500">사업자번호</dt><dd className="text-slate-800">{applicant.businessNo ?? '-'}</dd></div>
                </dl>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm text-slate-600">결제 완료 후 출원인 정보를 입력해 주세요.</p>
                {submissions.length ? (
                  <Link href={`/mypage/requests/${submissions[0].id}/applicant`} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:border-indigo-400 hover:text-indigo-600">출원인 정보 입력</Link>
                ) : null}
              </div>
            )}
          </section>

          {/* 출원 과정 안내 */}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">출원 과정 안내</h2>
            <div className="rounded-2xl bg-indigo-50 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
                {processSteps.map((step, idx) => (
                  <span key={`${step}-${idx}`} className="flex items-center gap-3">
                    <span>{step}</span>
                    {idx < processSteps.length - 1 ? (
                      <span className="text-slate-400">▶</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* 상표 출원 요청 */}
          <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-900">상표 출원 요청</h2>
              <p className="text-sm text-slate-600">
                제출된 브랜드 {submissions.length}건의 진행 상태와 담당 변리사 메모를 확인하세요.
              </p>
            </div>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              새 출원 요청 만들기
            </Link>
          </div>

          <div className="grid gap-4">
            {isFetching ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                </div>
              </div>
            ) : submissions.length > 0 ? (
              submissions.map((submission) => {
                const statusMeta = getStatusMeta(submission.status);
                const styles = statusStyles[submission.status] ?? statusStyles.default;

                return (
                  <article
                    key={submission.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${styles.badge}`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${styles.dot}`} aria-hidden />
                            {statusMeta.label}
                          </span>
                          <span className="text-xs text-slate-500">마지막 업데이트 {formatDateTime(submission.lastUpdated)}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">{submission.brandName}</h3>
                        <p className="text-sm text-slate-600">{statusMeta.description}</p>
                        <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <div className="flex gap-2">
                            <dt className="font-medium text-slate-500">신청 클래스</dt>
                            <dd className="text-slate-700">{submission.classes.join(", ")}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="font-medium text-slate-500">담당 변리사</dt>
                            <dd className="text-slate-700">{submission.representative}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="font-medium text-slate-500">접수일</dt>
                            <dd className="text-slate-700">{formatDateTime(submission.submittedAt)}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="font-medium text-slate-500">관리코드</dt>
                            <dd className="text-slate-700">{submission.referenceCode}</dd>
                          </div>
                        </dl>
                      </div>
                      <Link
                        href={`/mypage/requests/${submission.id}`}
                        className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                      >
                        상세 보기
                      </Link>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
                아직 등록된 상표 출원 요청이 없습니다. 첫 요청을 생성하면 진행 상황이 이곳에 표시됩니다.
              </div>
            )}
          </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
