"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { PaymentStatsResponse } from "@/types/stats";

type StatsPageClientProps = {
  initialStats: PaymentStatsResponse | null;
  error: string | null;
  adminRole: string;
};

function formatCurrency(amount: number, currency = "KRW"): string {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()}원`;
  }
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

function classNames(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export default function StatsPageClient({ initialStats, error: initialError, adminRole }: StatsPageClientProps) {
  const [stats, setStats] = useState<PaymentStatsResponse | null>(initialStats);
  const [error, setError] = useState<string | null>(initialError);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshStats = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/stats/payments");
      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "통계를 불러올 수 없습니다.");
      }

      const data = (await response.json()) as PaymentStatsResponse;
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "통계를 불러올 수 없습니다.";
      setError(message);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-medium text-rose-600">{error}</p>
            <button
              type="button"
              onClick={refreshStats}
              disabled={isRefreshing}
              className="mt-4 rounded-lg border border-rose-300 px-4 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? "새로고침 중..." : "다시 시도"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-slate-600">통계를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { overview, byStage, byMonth, overdueAnalysis } = stats;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* 헤더 */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">결제 통계 및 리포트</h1>
            <p className="mt-2 text-sm text-slate-600">
              월별 입금 현황, 단계별 결제 현황, 연체율 분석을 확인하세요.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              최종 업데이트: {new Date(stats.generatedAt).toLocaleString("ko-KR")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshStats}
              disabled={isRefreshing}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? "새로고침 중..." : "새로고침"}
            </button>
            <Link
              href="/admin/trademarks"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400"
            >
              대시보드로 돌아가기
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-600">
            {error}
          </div>
        ) : null}

        {/* 전체 개요 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">전체 개요</h2>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">총 결제 건수</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{overview.totalPayments}건</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">총 청구 금액</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(overview.totalAmount)}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
              <div className="text-xs text-emerald-600">입금 완료</div>
              <div className="mt-2 text-2xl font-bold text-emerald-700">
                {formatCurrency(overview.totalPaid)}
              </div>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 shadow-sm">
              <div className="text-xs text-amber-600">미수금</div>
              <div className="mt-2 text-2xl font-bold text-amber-700">
                {formatCurrency(overview.totalUnpaid)}
              </div>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 shadow-sm">
              <div className="text-xs text-rose-600">연체</div>
              <div className="mt-2 text-2xl font-bold text-rose-700">{overview.overdueCount}건</div>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
              <div className="text-xs text-indigo-600">환불</div>
              <div className="mt-2 text-2xl font-bold text-indigo-700">{overview.refundCount}건</div>
            </div>
          </div>
        </section>

        {/* 연체율 분석 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">연체율 분석</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-700">전체 연체율</div>
              <div className="mt-2 text-3xl font-bold text-rose-600">
                {formatPercent(overdueAnalysis.overdueRate)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {overdueAnalysis.overduePayments} / {overdueAnalysis.totalPayments} 건
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-700">평균 연체 기간</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                {overdueAnalysis.averageDaysOverdue.toFixed(1)}일
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-700">총 연체 금액</div>
              <div className="mt-2 text-2xl font-bold text-rose-600">
                {formatCurrency(overdueAnalysis.totalOverdueAmount)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-medium text-slate-700">단계별 연체</div>
              <dl className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-600">출원비:</dt>
                  <dd className="font-medium text-slate-900">{overdueAnalysis.overdueByStage.filing}건</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">중간비용:</dt>
                  <dd className="font-medium text-slate-900">{overdueAnalysis.overdueByStage.office_action}건</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">등록비:</dt>
                  <dd className="font-medium text-slate-900">{overdueAnalysis.overdueByStage.registration}건</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* 단계별 결제 현황 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">단계별 결제 현황</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    단계
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    총 건수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    완납
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    미납
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    연체
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    총 금액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    입금액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    미수금
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byStage.map((stage) => (
                  <tr key={stage.stage} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{stage.stageLabel}</td>
                    <td className="px-6 py-4 text-right text-sm text-slate-900">{stage.totalCount}</td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-600">{stage.paidCount}</td>
                    <td className="px-6 py-4 text-right text-sm text-amber-600">{stage.unpaidCount}</td>
                    <td className="px-6 py-4 text-right text-sm text-rose-600">{stage.overdueCount}</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                      {formatCurrency(stage.totalAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-emerald-600">
                      {formatCurrency(stage.paidAmount)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-amber-600">
                      {formatCurrency(stage.unpaidAmount)}
                    </td>
                  </tr>
                ))}
                {byStage.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-500">
                      단계별 데이터가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        {/* 월별 입금 현황 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">월별 입금 현황</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                    월
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    결제 건수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    완납 건수
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    총 금액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    입금액
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    미수금
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-700">
                    입금률
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byMonth.map((month) => {
                  const paymentRate =
                    month.totalAmount > 0 ? (month.paidAmount / month.totalAmount) * 100 : 0;
                  return (
                    <tr key={month.month} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{month.month}</td>
                      <td className="px-6 py-4 text-right text-sm text-slate-900">{month.paymentCount}</td>
                      <td className="px-6 py-4 text-right text-sm text-emerald-600">{month.paidCount}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                        {formatCurrency(month.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-emerald-600">
                        {formatCurrency(month.paidAmount)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-amber-600">
                        {formatCurrency(month.unpaidAmount)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <span
                          className={classNames(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            paymentRate >= 90
                              ? "bg-emerald-100 text-emerald-700"
                              : paymentRate >= 70
                              ? "bg-blue-100 text-blue-700"
                              : paymentRate >= 50
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          )}
                        >
                          {formatPercent(paymentRate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {byMonth.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">
                      월별 데이터가 없습니다.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
