"use client";

import { memo } from "react";

type StatusOption = {
  value: string;
  label: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "전체" },
  { value: "awaiting_payment", label: "입금대기" },
  { value: "payment_received", label: "결제완료" },
  { value: "awaiting_documents", label: "자료보완" },
  { value: "preparing_filing", label: "출원준비" },
  { value: "awaiting_client_signature", label: "서명대기" },
  { value: "filed", label: "출원완료" },
  { value: "office_action", label: "심사 진행중" },
  { value: "awaiting_client_response", label: "의견서" },
  { value: "awaiting_registration_fee", label: "등록료" },
  { value: "completed", label: "등록완료" },
  { value: "rejected", label: "거절" },
  { value: "cancelled", label: "취소됨" },
];

type StatusFilterProps = {
  value: string;
  onChange: (next: string) => void;
  searchTerm: string;
  onSearchTermChange: (next: string) => void;
  options?: StatusOption[];
  isBusy?: boolean;
  onRefresh?: () => void | Promise<unknown>;
};

function StatusFilterComponent({
  value,
  onChange,
  searchTerm,
  onSearchTermChange,
  options = STATUS_OPTIONS,
  isBusy = false,
  onRefresh,
}: StatusFilterProps) {
  return (
    <section
      aria-label="상태 및 검색 필터"
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="상태 선택">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "border border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex w-full items-center gap-3 rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-700 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500">
          <span className="text-slate-500" aria-hidden>
            🔍
          </span>
          <span className="sr-only">상표명 검색</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="상표명 또는 메모를 검색하세요"
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          {isBusy ? <span className="text-xs text-indigo-500">불러오는 중...</span> : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isBusy}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              새로고침
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export const StatusFilter = memo(StatusFilterComponent);
export type { StatusFilterProps, StatusOption };
export { STATUS_OPTIONS };
