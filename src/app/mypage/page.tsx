"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { useAuth } from "../providers/AuthProvider";
import {
  SubmissionStatus,
  TrademarkSubmission,
  fetchUserSubmissions,
  getStatusMeta,
} from "./mock-submissions";

const statusStyles: Record<SubmissionStatus, { badge: string; dot: string }> = {
  draft: { badge: "bg-slate-100 text-slate-700", dot: "bg-slate-500" },
  review: { badge: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500" },
  waiting: { badge: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  filed: { badge: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  completed: { badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
};

function formatDateTime(value: string) {
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

export default function MyPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [submissions, setSubmissions] = useState<TrademarkSubmission[]>([]);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !user?.email) {
      setSubmissions([]);
      setIsFetching(false);
      return () => {
        isMounted = false;
      };
    }

    setIsFetching(true);
    fetchUserSubmissions(user.email).then((data) => {
      if (isMounted) {
        setSubmissions(data);
        setIsFetching(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user]);

  const heroDescription = useMemo(() => {
    if (!isAuthenticated) {
      return "로그인 상태를 확인하고 있습니다.";
    }
    if (submissions.length === 0 && !isFetching) {
      return "아직 제출된 출원 요청이 없습니다. 첫 번째 브랜드를 등록해 보세요.";
    }
    return "담당 변리사와의 협업 현황을 한눈에 확인할 수 있습니다.";
  }, [isAuthenticated, isFetching, submissions.length]);

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
