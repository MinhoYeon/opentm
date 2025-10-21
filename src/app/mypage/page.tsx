import { redirect } from "next/navigation";

import MyPageClient, { TrademarkRequest } from "./MyPageClient";
import { createServerClient } from "@/lib/supabase/server";
import type { SupabaseUser } from "@/lib/supabase/server";

type PageSearchParams = {
  page?: string;
};

type PageProps = {
  searchParams?: PageSearchParams;
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
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.user) {
    redirect(`/login?redirect=${encodeURIComponent("/mypage")}`);
  }

  const page = toPositiveInteger(searchParams?.page, 1);
  const pageSize = 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error: listError } = await supabase.trademarkRequests.list({
    from,
    to,
    userId: session.user.id,
    userEmail: session.user.email,
    orderBy: "submitted_at",
    ascending: false,
  });

  if (listError) {
    throw listError;
  }

  const submissions: TrademarkRequest[] = (data ?? []).map((item) => {
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
      classes: toStringArray(record.classes),
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
                const styles = statusStyles[submission.status];

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
      ) : null}
    </div>
  );
}
