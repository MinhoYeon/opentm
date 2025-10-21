"use client";

import { useMemo } from "react";
import Link from "next/link";

type StatusTransition = {
  status: string;
  label?: string | null;
  description?: string | null;
  changedAt?: string | null;
};

type TrademarkRequest = {
  id: string;
  brandName: string;
  status: string;
  statusLabel?: string | null;
  statusDescription?: string | null;
  statusBadgeClass?: string | null;
  statusDotClass?: string | null;
  submittedAt?: string | null;
  lastUpdated?: string | null;
  classes: string[];
  representative?: string | null;
  referenceCode?: string | null;
  transitions: StatusTransition[];
};

type PaginationInfo = {
  page: number;
  pageSize: number;
  totalCount: number;
};

type AuthenticatedUser = {
  email: string | null;
  name: string | null;
};

type MyPageClientProps = {
  user: AuthenticatedUser;
  submissions: TrademarkRequest[];
  pagination: PaginationInfo;
};

const defaultStatusStyles: Record<string, { badge: string; dot: string }> = {
  draft: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  review: { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  waiting: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  filed: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  completed: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  default: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function createPageHref(page: number) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/mypage?${query}` : "/mypage";
}

function resolveStatusStyles(submission: TrademarkRequest) {
  if (submission.statusBadgeClass) {
    return {
      badge: submission.statusBadgeClass,
      dot: submission.statusDotClass ?? defaultStatusStyles.default.dot,
    };
  }

  return defaultStatusStyles[submission.status] ?? defaultStatusStyles.default;
}

function renderStatusTransitions(transitions: StatusTransition[]) {
  if (!transitions.length) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl bg-slate-50 p-4">
      <h4 className="text-sm font-semibold text-slate-700">최근 상태 이력</h4>
      <ol className="mt-2 space-y-2 text-sm text-slate-600">
        {transitions.map((transition, index) => (
          <li key={`${transition.status}-${index}`} className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-700">
              {transition.label ?? transition.status}
            </span>
            {transition.description ? <span>{transition.description}</span> : null}
            {transition.changedAt ? (
              <span className="text-xs text-slate-500">{formatDateTime(transition.changedAt)}</span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function MyPageClient({ user, submissions, pagination }: MyPageClientProps) {
  const heroDescription = useMemo(() => {
    if (!submissions.length) {
      return "아직 제출된 출원 요청이 없습니다. 첫 번째 브랜드를 등록해 보세요.";
    }

    return "담당 변리사와의 협업 현황을 한눈에 확인할 수 있습니다.";
  }, [submissions.length]);

  const totalPages = Math.max(Math.ceil(pagination.totalCount / pagination.pageSize), 1);
  const hasPreviousPage = pagination.page > 1;
  const hasNextPage = pagination.page < totalPages;
  const userName = user.name?.trim() || user.email?.trim() || "사용자";

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-medium text-indigo-500">내 상표 출원 현황</p>
        <h1 className="text-3xl font-semibold text-slate-900">마이페이지</h1>
        <p className="text-sm text-slate-600">{heroDescription}</p>
      </header>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">상표 출원 요청</h2>
            <p className="text-sm text-slate-500">{userName} 님의 신청 현황입니다.</p>
            <p className="text-sm text-slate-600">
              제출된 브랜드 {pagination.totalCount}건의 진행 상태와 담당 변리사 메모를 확인하세요.
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
          {submissions.length ? (
            submissions.map((submission) => {
              const styles = resolveStatusStyles(submission);
              const label = submission.statusLabel ?? submission.status;

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
                          {label}
                        </span>
                        <span className="text-xs text-slate-500">
                          마지막 업데이트 {formatDateTime(submission.lastUpdated)}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">{submission.brandName}</h3>
                      {submission.statusDescription ? (
                        <p className="text-sm text-slate-600">{submission.statusDescription}</p>
                      ) : null}
                      <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <div className="flex gap-2">
                          <dt className="font-medium text-slate-500">신청 클래스</dt>
                          <dd className="text-slate-700">
                            {submission.classes.length ? submission.classes.join(", ") : "-"}
                          </dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-medium text-slate-500">담당 변리사</dt>
                          <dd className="text-slate-700">{submission.representative ?? "-"}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-medium text-slate-500">접수일</dt>
                          <dd className="text-slate-700">{formatDateTime(submission.submittedAt)}</dd>
                        </div>
                        <div className="flex gap-2">
                          <dt className="font-medium text-slate-500">관리코드</dt>
                          <dd className="text-slate-700">{submission.referenceCode ?? "-"}</dd>
                        </div>
                      </dl>
                      {renderStatusTransitions(submission.transitions)}
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

        <div className="flex items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
          <span className="text-slate-600">
            페이지 {pagination.page} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Link
              aria-disabled={!hasPreviousPage}
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition ${
                hasPreviousPage
                  ? "text-slate-700 hover:bg-slate-100"
                  : "cursor-not-allowed text-slate-400"
              }`}
              href={hasPreviousPage ? createPageHref(pagination.page - 1) : "#"}
            >
              이전
            </Link>
            <Link
              aria-disabled={!hasNextPage}
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition ${
                hasNextPage ? "text-slate-700 hover:bg-slate-100" : "cursor-not-allowed text-slate-400"
              }`}
              href={hasNextPage ? createPageHref(pagination.page + 1) : "#"}
            >
              다음
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export type { MyPageClientProps, StatusTransition, TrademarkRequest };
