"use client";

import { useCallback, useMemo, useState } from "react";

import type { BankTransferReview } from "@/lib/payments/db";
import type { AdminCapabilities } from "@/lib/admin/roles";

type BankTransferAdminPageProps = {
  initialReviews: BankTransferReview[];
  capabilities: AdminCapabilities;
};

type Decision = "confirmed" | "rejected";

type ApiResponse = {
  ok: boolean;
  review?: BankTransferReview | null;
};

export default function BankTransferAdminPage({ initialReviews, capabilities }: BankTransferAdminPageProps) {
  const [reviews, setReviews] = useState<BankTransferReview[]>(initialReviews);
  const [selectedId, setSelectedId] = useState<number | null>(initialReviews[0]?.confirmationId ?? null);
  const [memo, setMemo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedReview = useMemo(() => reviews.find((item) => item.confirmationId === selectedId) ?? null, [
    reviews,
    selectedId,
  ]);

  const canManagePayments = capabilities.canManagePayments;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/bank-transfers?status=pending", { cache: "no-store" });
      const data = (await response.json()) as { ok: boolean; reviews?: BankTransferReview[]; error?: { message?: string } };
      if (!response.ok || !data.ok) {
        const message = data.error?.message ?? "입금 확인 요청을 불러오지 못했습니다.";
        throw new Error(message);
      }
      setReviews(data.reviews ?? []);
      setSelectedId((prev) => {
        if (prev && data.reviews?.some((item) => item.confirmationId === prev)) {
          return prev;
        }
        return data.reviews && data.reviews.length > 0 ? data.reviews[0].confirmationId : null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "목록을 새로고침하지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const applyDecision = useCallback(
    async (decision: Decision) => {
      if (!selectedReview) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/payments/bank", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            paymentId: selectedReview.paymentId,
            confirmationId: selectedReview.confirmationId,
            status: decision,
            memo: memo.trim() || null,
          }),
        });
        const data = (await response.json()) as ApiResponse & { error?: { message?: string } };
        if (!response.ok || !data.ok) {
          const message = data.error?.message ?? "처리에 실패했습니다.";
          throw new Error(message);
        }
        setMemo("");
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "처리 중 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [memo, refresh, selectedReview],
  );

  const reviewCards = reviews.map((review) => (
    <button
      key={review.confirmationId}
      type="button"
      onClick={() => setSelectedId(review.confirmationId)}
      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
        review.confirmationId === selectedId
          ? "border-indigo-400 bg-indigo-50 text-indigo-900"
          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">주문번호 {review.orderId}</span>
        <span className="text-xs text-slate-500">{new Date(review.requestedAt).toLocaleString()}</span>
      </div>
      <div className="mt-1 text-xs text-slate-500">
        {review.bankAccount.bankName ?? "은행 미지정"} · {review.bankAccount.accountNumber ?? "계좌 미지정"}
      </div>
      <div className="mt-2 text-sm font-medium text-slate-900">
        {review.amount.toLocaleString("ko-KR")} {review.currency}
      </div>
    </button>
  ));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">무통장 입금 확인</h1>
          <p className="text-sm text-slate-500">대기 중인 입금 확인 요청을 검토하고 처리하세요.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={refresh}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600"
            disabled={isLoading}
          >
            새로고침
          </button>
        </div>
      </header>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">대기 중</h2>
          <div className="space-y-3">
            {reviews.length > 0 ? reviewCards : <p className="text-sm text-slate-500">대기 중인 요청이 없습니다.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {selectedReview ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">주문번호</p>
                <p className="text-base text-slate-900">{selectedReview.orderId}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">금액</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {selectedReview.amount.toLocaleString("ko-KR")} {selectedReview.currency}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">입금자명</p>
                  <p className="text-base text-slate-900">{selectedReview.depositorName ?? "미기재"}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">은행</p>
                  <p className="text-base text-slate-900">{selectedReview.bankAccount.bankName ?? "확인 필요"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">계좌번호</p>
                  <p className="text-base text-slate-900">{selectedReview.bankAccount.accountNumber ?? "확인 필요"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">입금 예정일</p>
                <p className="text-base text-slate-900">{selectedReview.scheduledDate ?? "미기재"}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">요청 메모</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {selectedReview.note ?? "작성된 메모가 없습니다."}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-800" htmlFor="bank-transfer-admin-memo">
                  확인 메모
                </label>
                <textarea
                  id="bank-transfer-admin-memo"
                  value={memo}
                  onChange={(event) => setMemo(event.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="확인 결과 또는 추가 메모를 남겨주세요"
                  disabled={!canManagePayments || isLoading}
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => applyDecision("confirmed")}
                  className="flex-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300"
                  disabled={!canManagePayments || isLoading}
                >
                  입금 확인 완료
                </button>
                <button
                  type="button"
                  onClick={() => applyDecision("rejected")}
                  className="flex-1 rounded-full border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                  disabled={!canManagePayments || isLoading}
                >
                  확인 보류/반려
                </button>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              좌측 목록에서 확인할 요청을 선택하세요.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
