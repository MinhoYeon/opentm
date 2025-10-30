"use client";

import { memo } from "react";

import { STATUS_METADATA } from "@/lib/status";
import { TRADEMARK_STATUS_VALUES } from "@/types/status";

type StatusOption = {
  value: string;
  label: string;
};

// STATUS_METADATA를 기반으로 옵션 생성
const STATUS_OPTIONS: StatusOption[] = [
  { value: "all", label: "전체" },
  ...TRADEMARK_STATUS_VALUES.map((status) => ({
    value: status,
    label: STATUS_METADATA[status].label,
  })),
];

type StatusFilterProps = {
  value: string;
  onChange: (next: string) => void;
  searchTerm: string;
  onSearchTermChange: (next: string) => void;
  managementNumberSearch?: string;
  onManagementNumberSearchChange?: (next: string) => void;
  applicantNameSearch?: string;
  onApplicantNameSearchChange?: (next: string) => void;
  options?: StatusOption[];
  isBusy?: boolean;
  onRefresh?: () => void | Promise<unknown>;
};

function StatusFilterComponent({
  value,
  onChange,
  searchTerm,
  onSearchTermChange,
  managementNumberSearch = "",
  onManagementNumberSearchChange,
  applicantNameSearch = "",
  onApplicantNameSearchChange,
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

      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="text-xs text-slate-500 whitespace-nowrap">관리번호</span>
            <input
              type="search"
              value={managementNumberSearch}
              onChange={(event) => onManagementNumberSearchChange?.(event.target.value)}
              placeholder="예: TM000123"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="text-xs text-slate-500 whitespace-nowrap">상표명</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              placeholder="상표명 검색"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </label>

          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500">
            <span className="text-xs text-slate-500 whitespace-nowrap">출원인</span>
            <input
              type="search"
              value={applicantNameSearch}
              onChange={(event) => onApplicantNameSearchChange?.(event.target.value)}
              placeholder="출원인명 검색"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          {isBusy ? <span className="text-xs text-indigo-500 whitespace-nowrap">불러오는 중...</span> : null}
          {onRefresh ? (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isBusy}
              className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
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
