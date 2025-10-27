"use client";

import type { TrademarkRequest } from "../types";
import { SubmissionCard } from "./SubmissionCard";

type TrademarkRequestListProps = {
  requests: TrademarkRequest[];
  error?: string | null;
  isMutating?: boolean;
  isLoading?: boolean;
  onStatusChange?: (requestId: string, nextStatus: string) => Promise<unknown> | void;
};

export function TrademarkRequestList({
  requests,
  error,
  isMutating = false,
  isLoading = false,
  onStatusChange,
}: TrademarkRequestListProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">출원 요청 목록</h3>
        <p className="text-sm text-slate-600">상태를 빠르게 확인하고 필요한 작업을 바로 진행하세요.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      {!isLoading && requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          아직 등록된 상표 출원 요청이 없습니다. 첫 요청을 생성하면 진행 상황이 이곳에 표시됩니다.
        </div>
      ) : null}

      <div className="grid gap-4">
        {requests.map((request) => (
          <SubmissionCard
            key={request.id}
            request={request}
            isMutating={isMutating}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </div>
  );
}
