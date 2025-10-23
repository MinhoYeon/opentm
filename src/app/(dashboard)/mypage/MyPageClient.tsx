"use client";

import { useMemo } from "react";
import Link from "next/link";

import type {
  ApplicantSummary,
  AuthenticatedUser,
  PaginationInfo,
  TrademarkRequest,
} from "./types";
import { TrademarkRequestList } from "./components/TrademarkRequestList";
import { useTrademarkRequests } from "./hooks/useTrademarkRequests";

type MyPageClientProps = {
  user: AuthenticatedUser;
  submissions: TrademarkRequest[];
  pagination: PaginationInfo;
  processSteps: string[];
  applicant: ApplicantSummary | null;
};

function createPageHref(page: number) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/mypage?${query}` : "/mypage";
}

export default function MyPageClient({
  user,
  submissions,
  pagination,
  processSteps,
  applicant,
}: MyPageClientProps) {
  const { requests, refresh, updateStatus, isMutating, error } = useTrademarkRequests({
    initialRequests: submissions,
    userId: user.id,
  });

  const heroDescription = useMemo(() => {
    if (!requests.length) {
      return "아직 제출된 출원 요청이 없습니다. 첫 번째 브랜드를 등록해 보세요.";
    }

    return "담당 변리사와의 협업 현황을 한눈에 확인할 수 있습니다.";
  }, [requests.length]);

  const computedTotal = Math.max(pagination.totalCount, requests.length);
  const totalPages = Math.max(Math.ceil(computedTotal / pagination.pageSize), 1);
  const hasPreviousPage = pagination.page > 1;
  const hasNextPage = pagination.page < totalPages;
  const userName = user.name?.trim() || user.email?.trim() || "사용자";
  const userEmail = user.email ?? "-";
  const latestRequestId = requests[0]?.id ?? applicant?.requestId ?? submissions[0]?.id ?? null;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-medium text-indigo-500">내 상표 출원 현황</p>
        <h1 className="text-3xl font-semibold text-slate-900">마이페이지</h1>
        <p className="text-sm text-slate-600">{heroDescription}</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">회원정보</h2>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <p className="text-base font-medium text-slate-900">{userName}</p>
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

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">출원인 정보</h2>
        {applicant ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-500">이름</dt>
                <dd className="text-slate-800">{applicant.name ?? "-"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-500">이메일</dt>
                <dd className="text-slate-800">{applicant.email ?? "-"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-500">전화</dt>
                <dd className="text-slate-800">{applicant.phone ?? "-"}</dd>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <dt className="w-24 shrink-0 text-slate-500">주소</dt>
                <dd className="text-slate-800">{applicant.address ?? "-"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-500">구분</dt>
                <dd className="text-slate-800">{applicant.businessType ?? "-"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-slate-500">사업자번호</dt>
                <dd className="text-slate-800">{applicant.businessNo ?? "-"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">결제 완료 후 출원인 정보를 입력해 주세요.</p>
            {latestRequestId ? (
              <Link
                href={`/mypage/requests/${latestRequestId}/applicant`}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600"
              >
                출원인 정보 입력
              </Link>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">출원 과정 안내</h2>
        <div className="rounded-2xl bg-indigo-50 p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
            {processSteps.map((step, idx) => (
              <span key={`${step}-${idx}`} className="flex items-center gap-3">
                <span>{step}</span>
                {idx < processSteps.length - 1 ? <span className="text-slate-400">▶</span> : null}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">상표 출원 요청</h2>
            <p className="text-sm text-slate-500">{userName} 님의 신청 현황입니다.</p>
            <p className="text-sm text-slate-600">
              제출된 브랜드 {computedTotal}건의 진행 상태와 담당 변리사 메모를 확인하세요.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            새 출원 요청 만들기
          </Link>
        </div>

        <TrademarkRequestList
          requests={requests}
          error={error}
          isMutating={isMutating}
          onRefresh={refresh}
          onStatusChange={updateStatus}
        />

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

export type { MyPageClientProps };
