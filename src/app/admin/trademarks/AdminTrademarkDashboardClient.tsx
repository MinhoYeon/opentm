"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import {
  type AdminActivityLog,
  type AdminDashboardFilters,
  type AdminDashboardPagination,
  type AdminTrademarkRequest,
  type AdminUserSummary,
  type SavedFilter,
  type StatusSummary,
  type DashboardStats,
} from "./types";
import type { AdminCapabilities } from "@/lib/admin/roles";
import { TRADEMARK_STATUS_VALUES, type TrademarkStatus } from "@/types/status";
import { useApplicationPayments } from "./hooks/useApplicationPayments";
import { PaymentCard } from "./components/PaymentCard";
import { getPaymentStageLabel } from "@/types/trademark";
import { STATUS_METADATA } from "@/lib/status";

const DEFAULT_FILTERS: AdminDashboardFilters = {
  statuses: [],
  paymentStates: [],
  tags: [],
  search: "",
  managementNumberSearch: "",
  customerNameSearch: "",
  assignedTo: undefined,
  dateRange: null,
};

type StatusOption = {
  value: string;
  label: string;
  description?: string;
};

type AdminTrademarkDashboardClientProps = {
  admin: AdminUserSummary;
  initialTrademarks: AdminTrademarkRequest[];
  initialPagination: AdminDashboardPagination;
  initialStatusSummary: StatusSummary[];
  initialFilters: AdminDashboardFilters;
  statusOptions: StatusOption[];
  recentActivity: AdminActivityLog[];
  savedFilters?: SavedFilter[];
  dashboardStats: DashboardStats;
};

type HeaderStat = {
  key: string;
  label: string;
  description?: string;
  value: number;
  accentClass: string;
};

type BulkAction = {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  onAction: () => Promise<void> | void;
};

function classNames(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatCurrency(amount?: number | null, currency = "KRW") {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "-";
  }
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()} ${currency}`;
  }
}

function buildHeaderStats(summary: StatusSummary[], totalCount: number): HeaderStat[] {
  const statusMap = new Map(summary.map((item) => [item.status, item.count]));
  return [
    {
      key: "awaiting_payment",
      label: "입금 대기",
      description: "결제 확인 필요",
      value: statusMap.get("awaiting_payment") ?? 0,
      accentClass: "bg-amber-100 text-amber-700",
    },
    {
      key: "preparing_filing",
      label: "출원 준비",
      description: "자료 검토 중",
      value: statusMap.get("preparing_filing") ?? 0,
      accentClass: "bg-indigo-100 text-indigo-700",
    },
    {
      key: "filed",
      label: "출원 완료",
      description: "특허청 제출 완료",
      value: statusMap.get("filed") ?? 0,
      accentClass: "bg-blue-100 text-blue-700",
    },
    {
      key: "total",
      label: "전체",
      description: "총 신청 건수",
      value: totalCount,
      accentClass: "bg-slate-200 text-slate-800",
    },
  ];
}

type FilterSidebarProps = {
  admin: AdminUserSummary;
  filters: AdminDashboardFilters;
  statusOptions: StatusOption[];
  statusSummary: StatusSummary[];
  onApply: (filters: AdminDashboardFilters) => void;
  onReset: () => void;
  savedFilters?: SavedFilter[];
};

function FilterSidebar({ admin, filters, statusOptions, statusSummary, onApply, onReset, savedFilters }: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<AdminDashboardFilters>(filters);
  const [selectedSavedFilter, setSelectedSavedFilter] = useState<string | null>(null);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const toggleStatus = useCallback(
    (status: string) => {
      setLocalFilters((prev) => {
        const exists = prev.statuses.includes(status);
        const statuses = exists
          ? prev.statuses.filter((item) => item !== status)
          : [...prev.statuses, status];
        const newFilters = { ...prev, statuses };
        // 다음 렌더링 사이클에서 필터 적용
        setTimeout(() => onApply(newFilters), 0);
        return newFilters;
      });
    },
    [onApply]
  );

  const togglePaymentState = useCallback((state: string) => {
    setLocalFilters((prev) => {
      const exists = prev.paymentStates.includes(state);
      const paymentStates = exists
        ? prev.paymentStates.filter((item) => item !== state)
        : [...prev.paymentStates, state];
      const newFilters = { ...prev, paymentStates };
      // 다음 렌더링 사이클에서 필터 적용
      setTimeout(() => onApply(newFilters), 0);
      return newFilters;
    });
  }, [onApply]);

  const updateDateRange = useCallback(
    (range: AdminDashboardFilters["dateRange"]) => {
      setLocalFilters((prev) => ({
        ...prev,
        dateRange: range,
      }));
    },
    []
  );

  const handleApply = useCallback(() => {
    console.log('🔍 [FilterSidebar DEBUG] Applying filters:', localFilters);
    onApply(localFilters);
  }, [localFilters, onApply]);

  const handleReset = useCallback(() => {
    setLocalFilters({ ...DEFAULT_FILTERS });
    setSelectedSavedFilter(null);
    onReset();
  }, [onReset]);

  const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleApply();
    }
  }, [handleApply]);

  const handleSavedFilterSelect = useCallback(
    (filterId: string) => {
      setSelectedSavedFilter(filterId);
      const selected = savedFilters?.find((item) => item.id === filterId);
      if (selected) {
        setLocalFilters(selected.filters);
        onApply(selected.filters);
      }
    },
    [onApply, savedFilters]
  );

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">접속 중</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{admin.name ?? admin.email ?? "관리자"}</div>
        <div className="text-xs text-slate-500">역할: {admin.role}</div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">필터</h2>
        <p className="text-xs text-slate-600">상태, 결제, 담당자 조건을 조합해 필요한 신청만 모아보세요.</p>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-700">통합 검색</label>
        <input
          type="search"
          value={localFilters.search ?? ""}
          onChange={(event) =>
            setLocalFilters((prev) => ({ ...prev, search: event.target.value }))
          }
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="관리번호, 고객명, 이메일, 상표명, 메모 (Enter로 검색)"
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-700">관리번호 검색</label>
        <input
          type="search"
          value={localFilters.managementNumberSearch ?? ""}
          onChange={(event) =>
            setLocalFilters((prev) => ({ ...prev, managementNumberSearch: event.target.value }))
          }
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="예: TM000123 (Enter로 검색)"
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-700">고객명 검색</label>
        <input
          type="search"
          value={localFilters.customerNameSearch ?? ""}
          onChange={(event) =>
            setLocalFilters((prev) => ({ ...prev, customerNameSearch: event.target.value }))
          }
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="고객명 입력 (Enter로 검색)"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-700">상태</p>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const active = localFilters.statuses.includes(option.value);
            const count = statusSummary.find(s => s.status === option.value)?.count ?? 0;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleStatus(option.value)}
                className={classNames(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                    : "border-slate-300 text-slate-600 hover:border-indigo-300 hover:text-indigo-500"
                )}
              >
                {option.label}({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-700">결제 상태</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "unpaid", label: "결제 대기" },
            { value: "paid", label: "결제 완료" },
            { value: "partial", label: "부분 결제" },
            { value: "refund_requested", label: "환불 요청" },
            { value: "refunded", label: "환불 완료" },
            { value: "overdue", label: "기한 초과" },
          ].map((item) => {
            const active = localFilters.paymentStates.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => togglePaymentState(item.value)}
                className={classNames(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-rose-500 bg-rose-50 text-rose-600"
                    : "border-slate-300 text-slate-600 hover:border-rose-300 hover:text-rose-500"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-700">담당자</label>
        <input
          type="text"
          value={localFilters.assignedTo ?? ""}
          onChange={(event) =>
            setLocalFilters((prev) => ({
              ...prev,
              assignedTo: event.target.value ? event.target.value : undefined,
            }))
          }
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="담당자 이메일 또는 ID (Enter로 검색)"
        />
      </div>

      <div className="space-y-3">
        <label className="text-xs font-semibold text-slate-700">태그</label>
        <input
          type="text"
          value={localFilters.tags.join(", ")}
          onChange={(event) => {
            const tokens = event.target.value
              .split(",")
              .map((token) => token.trim())
              .filter(Boolean);
            setLocalFilters((prev) => ({ ...prev, tags: tokens }));
          }}
          onKeyDown={handleSearchKeyDown}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="VIP, 우선심사 등 (Enter로 검색)"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700">기간</label>
        <select
          value={localFilters.dateRange?.field ?? "created_at"}
          onChange={(event) =>
            updateDateRange({
              field: event.target.value as AdminDashboardFilters["dateRange"] extends infer R
                ? R extends { field: infer F }
                  ? F
                  : never
                : never,
              from: localFilters.dateRange?.from ?? "",
              to: localFilters.dateRange?.to ?? "",
            })
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="created_at">생성일</option>
          <option value="updated_at">최근 업데이트</option>
          <option value="submitted_at">제출일</option>
          <option value="filing_submitted_at">출원 제출일</option>
          <option value="filed_at">출원일</option>
          <option value="status_updated_at">상태 변경일</option>
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            value={localFilters.dateRange?.from ?? ""}
            onChange={(event) =>
              updateDateRange({
                ...(localFilters.dateRange ?? { field: "created_at" }),
                from: event.target.value,
              })
            }
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <input
            type="date"
            value={localFilters.dateRange?.to ?? ""}
            onChange={(event) =>
              updateDateRange({
                ...(localFilters.dateRange ?? { field: "created_at" }),
                to: event.target.value,
              })
            }
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {savedFilters && savedFilters.length > 0 ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">저장된 필터</label>
          <div className="space-y-2">
            {savedFilters.map((filter) => {
              const active = selectedSavedFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => handleSavedFilterSelect(filter.id)}
                  className={classNames(
                    "flex w-full items-start justify-between rounded-xl border px-3 py-2 text-left text-xs transition",
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                      : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-500"
                  )}
                >
                  <span className="font-medium">{filter.name}</span>
                  {filter.description ? (
                    <span className="text-[10px] text-slate-500">{filter.description}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex gap-2 pt-4">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-700"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-500"
        >
          적용하기
        </button>
      </div>
    </div>
  );
}

type ApplicationsTableProps = {
  applications: AdminTrademarkApplication[];
  pagination: AdminDashboardPagination;
  selectedIds: string[];
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onSelectApplication: (application: AdminTrademarkApplication) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onUnapprove?: (application: AdminTrademarkApplication) => void;
};

function ApplicationsTable({
  applications,
  pagination,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onSelectApplication,
  onPageChange,
  isLoading,
  error,
  onRefresh,
  onUnapprove,
}: ApplicationsTableProps) {
  const allSelected = applications.length > 0 && applications.every((app) => selectedIds.includes(app.id));

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">신청 목록</h2>
          <p className="text-xs text-slate-600">필터링된 결과 {applications.length}건을 표시합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            새로고침
          </button>
          <div className="text-xs text-slate-500">
            페이지 {pagination.page} / {Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      ) : null}

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  관리번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  신청인 / 상표명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상품류
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  결제
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  담당자
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  최근 업데이트
                </th>
                {onUnapprove ? (
                  <th className="w-32 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                    작업
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((application) => {
                const selected = selectedIds.includes(application.id);
                return (
                  <tr
                    key={application.id}
                    className={classNames(
                      "cursor-pointer bg-white transition hover:bg-indigo-50",
                      selected ? "bg-indigo-50" : ""
                    )}
                    onClick={() => onSelectApplication(application)}
                  >
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleRow(application.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {application.managementNumber ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{application.brandName}</div>
                      <div className="text-xs text-slate-500">{application.applicantName ?? application.applicantEmail ?? "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {application.productClasses.length > 0
                        ? application.productClasses.slice(0, 2).join(", ") +
                          (application.productClasses.length > 2
                            ? ` 외 ${application.productClasses.length - 2}`
                            : "")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {application.status}
                      </span>
                      {application.statusDetail ? (
                        <p className="mt-1 text-xs text-slate-500">{application.statusDetail}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {formatCurrency(application.payment.amount, application.payment.currency ?? "KRW")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {application.payment.state === "paid"
                          ? `입금 ${formatDateTime(application.payment.receivedAt)}`
                          : application.payment.state === "unpaid"
                          ? `기한 ${formatDateTime(application.payment.dueAt)}`
                          : application.payment.state === "overdue"
                          ? `연체 ${formatDateTime(application.payment.dueAt)}`
                          : application.payment.state === "partial"
                          ? "부분 입금"
                          : application.payment.state === "refund_requested"
                          ? "환불 요청"
                          : "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {application.assignedTo?.name ?? application.assignedTo?.email ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDateTime(application.lastTouchedAt ?? application.updatedAt)}
                    </td>
                    {onUnapprove && application.metadata?.auto_created ? (
                      <td className="px-4 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            if (confirm(`${application.brandName} 출원을 승인 해제하시겠습니까?`)) {
                              onUnapprove(application);
                            }
                          }}
                          className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-50"
                        >
                          승인 해제
                        </button>
                      </td>
                    ) : onUnapprove ? (
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-slate-400">-</span>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
              {applications.length === 0 && !isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={onUnapprove ? 9 : 8}>
                    <div className="text-sm text-slate-600">조건에 맞는 신청이 없습니다.</div>
                    <div className="mt-2 text-xs text-slate-500">
                      필터를 조정해 보거나, 데이터베이스에 상표등록 신청 데이터가 있는지 확인해주세요.
                    </div>
                  </td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={onUnapprove ? 9 : 8}>
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <div>
            총 {pagination.totalCount.toLocaleString()}건 / 페이지당 {pagination.pageSize}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              disabled={pagination.page <= 1}
            >
              이전
            </button>
            <button
              type="button"
              onClick={() =>
                onPageChange(
                  Math.min(Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize)), pagination.page + 1)
                )
              }
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              disabled={pagination.page >= Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type UnifiedTableProps = {
  items: AdminTrademarkRequest[];
  pagination: AdminDashboardPagination;
  selectedIds: string[];
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onApprove: (item: AdminTrademarkRequest) => void;
  onUnapprove: (item: AdminTrademarkRequest) => void;
  onSelectTrademark?: (trademark: AdminTrademarkRequest) => void;
};

function UnifiedTable({
  items,
  pagination,
  selectedIds,
  onToggleRow,
  onToggleAll,
  onPageChange,
  isLoading,
  error,
  onRefresh,
  onApprove,
  onUnapprove,
  onSelectTrademark,
}: UnifiedTableProps) {
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  const formatDateTime = (value?: string | null) => {
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
      return value;
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">상표 신청 목록</h2>
          <p className="text-xs text-slate-600">
            총 {items.length}건 (접수중: {items.filter(i => i.status === "submitted").length}, 처리중: {items.filter(i => i.status !== "submitted").length})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            새로고침
          </button>
          <div className="text-xs text-slate-500">
            페이지 {pagination.page} / {Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      ) : null}

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  관리번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  고객명 및 이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상표명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  이미지
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상품류
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  담당자 이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  요청일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  결제 상태
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const selected = selectedIds.includes(item.id);
                const formatDate = (dateStr?: string | null) => {
                  if (!dateStr) return "-";
                  try {
                    return new Intl.DateTimeFormat("ko-KR", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date(dateStr));
                  } catch {
                    return dateStr;
                  }
                };

                // 현재 상태
                const currentStatus = item.status;

                // 결제가 필요한 상태인지 확인
                const paymentRequiredStatuses = ["submitted", "awaiting_acceleration", "awaiting_office_action", "registration_decided"];
                const needsPayment = paymentRequiredStatuses.includes(currentStatus);

                // 결제 상태
                const paymentStatus = item.payment?.state;
                const getPaymentStatusLabel = (status?: string | null) => {
                  if (!status) return "-";
                  const labels: Record<string, string> = {
                    not_requested: "미요청",
                    quote_sent: "견적 발송",
                    unpaid: "결제 대기",
                    partial: "부분 결제",
                    paid: "결제 완료",
                    overdue: "연체",
                    refund_requested: "환불 요청",
                    refunded: "환불 완료",
                  };
                  return labels[status] || status;
                };

                return (
                  <tr
                    key={item.id}
                    className={classNames(
                      "cursor-pointer bg-white transition hover:bg-indigo-50",
                      selected ? "bg-indigo-50" : ""
                    )}
                    onClick={() => onSelectTrademark?.(item)}
                  >
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => onToggleRow(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.management_number || "미배정"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {item.applicant_name || "-"}
                      </div>
                      <div className="text-xs text-slate-500">{item.applicant_email || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">{item.brand_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.trademark_image_url ? (
                        <img
                          src={item.trademark_image_url}
                          alt={item.brand_name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-slate-100 text-xs text-slate-400">
                          -
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.product_classes.length > 0
                        ? item.product_classes.slice(0, 2).join(", ") +
                          (item.product_classes.length > 2 ? ` 외 ${item.product_classes.length - 2}` : "")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{item.representative_email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(item.submitted_at)}</td>
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <select
                        value={currentStatus}
                        onChange={async (event) => {
                          const newStatus = event.target.value;
                          const originalValue = currentStatus;

                          if (!confirm(`상태를 "${STATUS_METADATA[newStatus as TrademarkStatus]?.label}"(으)로 변경하시겠습니까?`)) {
                            event.target.value = originalValue;
                            return;
                          }

                          try {
                            const response = await fetch(`/api/trademarks/${item.id}/status`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                status: newStatus,
                                statusDetail: `관리자가 드롭다운에서 상태를 변경했습니다.`,
                              }),
                            });

                            if (!response.ok) {
                              const error = await response.json();
                              throw new Error(error.error || "상태 변경에 실패했습니다.");
                            }

                            // 성공 시 페이지 새로고침
                            window.location.reload();
                          } catch (error) {
                            console.error("상태 변경 실패:", error);
                            alert(error instanceof Error ? error.message : "상태 변경에 실패했습니다.");
                            event.target.value = originalValue;
                          }
                        }}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {TRADEMARK_STATUS_VALUES.map((status) => (
                          <option key={status} value={status}>
                            {STATUS_METADATA[status]?.label || status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      {needsPayment ? (
                        <select
                          value={paymentStatus || "not_requested"}
                          onChange={async (event) => {
                            const newPaymentStatus = event.target.value;
                            const originalValue = paymentStatus || "not_requested";

                            const paymentStatusLabels: Record<string, string> = {
                              not_requested: "미요청",
                              quote_sent: "견적 발송",
                              unpaid: "결제 대기",
                              partial: "부분 결제",
                              paid: "결제 완료",
                              overdue: "연체",
                              refund_requested: "환불 요청",
                              refunded: "환불 완료",
                            };

                            if (!confirm(`결제 상태를 "${paymentStatusLabels[newPaymentStatus]}"(으)로 변경하시겠습니까?`)) {
                              event.target.value = originalValue;
                              return;
                            }

                            try {
                              // 먼저 해당 request의 payment를 조회 (request_id 기반)
                              const paymentsResponse = await fetch(`/api/admin/trademark-requests/${item.id}/payments`);

                              if (!paymentsResponse.ok) {
                                throw new Error("결제 정보를 조회할 수 없습니다.");
                              }

                              const payments = await paymentsResponse.json();

                              // 현재 상태에 맞는 payment stage 결정
                              let paymentStage = "filing";
                              if (currentStatus === "awaiting_office_action") {
                                paymentStage = "office_action";
                              } else if (currentStatus === "registration_decided") {
                                paymentStage = "registration";
                              }

                              // 해당 stage의 payment 찾기
                              const payment = Array.isArray(payments)
                                ? payments.find((p: any) => p.payment_stage === paymentStage)
                                : null;

                              if (!payment?.id) {
                                alert("결제 정보가 없습니다. 먼저 결제를 생성해주세요.");
                                event.target.value = originalValue;
                                return;
                              }

                              // payment 업데이트
                              const updateResponse = await fetch(`/api/admin/payments/${payment.id}`, {
                                method: "PATCH",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  paymentStatus: newPaymentStatus,
                                }),
                              });

                              if (!updateResponse.ok) {
                                const error = await updateResponse.json();
                                throw new Error(error.error || "결제 상태 변경에 실패했습니다.");
                              }

                              // 성공 시 페이지 새로고침
                              window.location.reload();
                            } catch (error) {
                              console.error("결제 상태 변경 실패:", error);
                              alert(error instanceof Error ? error.message : "결제 상태 변경에 실패했습니다.");
                              event.target.value = originalValue;
                            }
                          }}
                          className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="not_requested">미요청</option>
                          <option value="quote_sent">견적 발송</option>
                          <option value="unpaid">결제 대기</option>
                          <option value="partial">부분 결제</option>
                          <option value="paid">결제 완료</option>
                          <option value="overdue">연체</option>
                          <option value="refund_requested">환불 요청</option>
                          <option value="refunded">환불 완료</option>
                        </select>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>

                    {/* 작업 (Delete) */}
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`"${item.brand_name}" 상표 요청을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                            return;
                          }

                          try {
                            const response = await fetch(`/api/admin/trademark-requests/${item.id}`, {
                              method: "DELETE",
                            });

                            if (!response.ok) {
                              const data = await response.json().catch(() => ({}));
                              throw new Error(data.error || "삭제에 실패했습니다.");
                            }

                            alert("삭제되었습니다.");
                            window.location.reload();
                          } catch (error) {
                            alert(error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다.");
                          }
                        }}
                        className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && !isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={10}>
                    <div className="text-sm text-slate-600">신청서가 없습니다.</div>
                    <div className="mt-2 text-xs text-slate-500">
                      사용자가 신청서를 제출하면 이곳에 표시됩니다.
                    </div>
                  </td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={10}>
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <div>
            총 {pagination.totalCount.toLocaleString()}건 / 페이지당 {pagination.pageSize}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              disabled={pagination.page <= 1}
            >
              이전
            </button>
            <button
              type="button"
              onClick={() =>
                onPageChange(
                  Math.min(Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize)), pagination.page + 1)
                )
              }
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              disabled={pagination.page >= Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type RequestsTableProps = {
  requests: AdminTrademarkRequest[];
  pagination: RequestsPagination;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  error?: string | null;
  onRefresh: () => void;
  onApprove: (request: AdminTrademarkRequest) => void;
};

function RequestsTable({
  requests,
  pagination,
  onPageChange,
  isLoading,
  error,
  onRefresh,
  onApprove,
}: RequestsTableProps) {
  const formatDateTime = (value?: string | null) => {
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
      return value;
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">신청서 대기 목록</h2>
          <p className="text-xs text-slate-600">사용자가 제출한 신청서 {requests.length}건을 표시합니다.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
          >
            새로고침
          </button>
          <div className="text-xs text-slate-500">
            페이지 {pagination.page} / {Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
      ) : null}

      <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상표명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상표 유형
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상품류
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  담당자 이메일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  제출일
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  상태
                </th>
                <th className="w-32 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr key={request.id} className="bg-white transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-slate-900">{request.brand_name}</div>
                    {request.additional_notes ? (
                      <div className="text-xs text-slate-500">{request.additional_notes.slice(0, 50)}...</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {request.trademark_type === "word"
                      ? "문자"
                      : request.trademark_type === "logo"
                      ? "도형"
                      : request.trademark_type === "combined"
                      ? "결합"
                      : request.trademark_type || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {request.product_classes.length > 0
                      ? request.product_classes.slice(0, 2).join(", ") +
                        (request.product_classes.length > 2 ? ` 외 ${request.product_classes.length - 2}` : "")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{request.representative_email}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(request.submitted_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={classNames(
                        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
                        request.status === "submitted"
                          ? "bg-amber-100 text-amber-700"
                          : request.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      )}
                    >
                      {request.status === "submitted"
                        ? "승인 대기"
                        : request.status === "approved"
                        ? "승인됨"
                        : request.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {request.status === "submitted" ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`${request.brand_name} 신청서를 승인하시겠습니까?`)) {
                            onApprove(request);
                          }
                        }}
                        className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-100"
                      >
                        승인
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && !isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={7}>
                    <div className="text-sm text-slate-600">대기 중인 신청서가 없습니다.</div>
                    <div className="mt-2 text-xs text-slate-500">
                      모든 신청서가 자동으로 승인되어 출원 관리 목록으로 이동했습니다.
                    </div>
                  </td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={7}>
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
          <div>
            총 {pagination.totalCount.toLocaleString()}건 / 페이지당 {pagination.pageSize}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              disabled={pagination.page <= 1}
            >
              이전
            </button>
            <button
              type="button"
              onClick={() =>
                onPageChange(
                  Math.min(Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize)), pagination.page + 1)
                )
              }
              className="rounded-full border border-slate-300 px-3 py-1 font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
              disabled={pagination.page >= Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type ActivityFeedProps = {
  activity: AdminActivityLog[];
};

function ActivityFeed({ activity }: ActivityFeedProps) {
  if (activity.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500">
        최근 활동 로그가 없습니다.
      </div>
    );
  }
  return (
    <ul className="space-y-4">
      {activity.map((item) => (
        <li key={item.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>{item.actorName ?? "시스템"}</span>
            <span>{formatDateTime(item.createdAt)}</span>
          </div>
          <div className="mt-1 text-sm font-medium text-slate-900">{item.summary}</div>
          {item.metadata ? (
            <pre className="mt-2 max-h-24 overflow-auto rounded-lg bg-slate-50 p-2 text-[10px] text-slate-500">
              {JSON.stringify(item.metadata, null, 2)}
            </pre>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

type UtilityRailProps = {
  admin: AdminUserSummary;
  selectedCount: number;
  capabilities: AdminCapabilities;
  onBulkAction: (actionId: string) => Promise<void> | void;
  activity: AdminActivityLog[];
};

function UtilityRail({ admin, selectedCount, capabilities, onBulkAction, activity }: UtilityRailProps) {
  const actions: BulkAction[] = useMemo(() => {
    const items: BulkAction[] = [
      {
        id: "bulk-status",
        label: "상태 일괄 변경",
        description: "선택한 신청의 상태를 한 번에 변경",
        disabled: !capabilities.canManageStatuses || selectedCount === 0,
        onAction: () => onBulkAction("bulk-status"),
      },
      {
        id: "bulk-assign",
        label: "담당자 지정",
        description: "선택 신청에 담당자 배정",
        disabled: selectedCount === 0,
        onAction: () => onBulkAction("bulk-assign"),
      },
      {
        id: "bulk-remind",
        label: "서류 요청",
        description: "선택 신청자에게 리마인더 전송",
        disabled: selectedCount === 0,
        onAction: () => onBulkAction("bulk-remind"),
      },
    ];
    if (capabilities.canManagePayments) {
      items.push({
        id: "bulk-payment",
        label: "입금 확인",
        description: "선택 건 입금 처리",
        disabled: selectedCount === 0,
        onAction: () => onBulkAction("bulk-payment"),
      });
    }
    return items;
  }, [capabilities, onBulkAction, selectedCount]);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">퀵 액션</h3>
        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => action.onAction()}
              disabled={action.disabled}
              className={classNames(
                "w-full rounded-xl border px-3 py-3 text-left text-xs transition",
                action.disabled
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
              )}
            >
              <div className="font-semibold">{action.label}</div>
              {action.description ? <p className="mt-1 text-[11px] text-slate-500">{action.description}</p> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">최근 활동</h3>
        <ActivityFeed activity={activity} />
      </div>

      <div className="mt-auto space-y-2 pt-4">
        <Link
          href="/docs/admin-trademark-dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
        >
          대시보드 가이드 보기
        </Link>
        <button
          type="button"
          className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700"
          onClick={() => window.open("/admin/logs", "_blank")}
        >
          감사 로그 전체 보기
        </button>
      </div>
    </div>
  );
}

type StatusUpdateFormProps = {
  application: AdminTrademarkRequest;
  statusOptions: StatusOption[];
  capabilities: AdminCapabilities;
  onUpdated: (updated: AdminTrademarkRequest) => void;
};

function StatusUpdateForm({ application, statusOptions, capabilities, onUpdated }: StatusUpdateFormProps) {
  const [status, setStatus] = useState(application.status);
  const [detail, setDetail] = useState(application.status_detail ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState(true);

  const requiresMemo = useMemo(() => {
    const currentIndex = TRADEMARK_STATUS_VALUES.indexOf(application.status);
    const nextIndex = TRADEMARK_STATUS_VALUES.indexOf(status as (typeof TRADEMARK_STATUS_VALUES)[number]);
    return currentIndex >= 0 && nextIndex >= 0 && nextIndex < currentIndex;
  }, [application.status, status]);

  useEffect(() => {
    setStatus(application.status);
    setDetail(application.status_detail ?? "");
  }, [application]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!capabilities.canManageStatuses) {
        setError("상태 변경 권한이 없습니다.");
        return;
      }
      if (requiresMemo && !detail.trim()) {
        setError("상태를 되돌릴 때는 상세 메모를 남겨야 합니다.");
        return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
        const response = await fetch(`/api/trademarks/${application.id}/status`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            status,
            statusDetail: detail,
            metadata: {
              notify: notification,
              source: "admin-dashboard",
            },
          }),
        });
        if (!response.ok) {
          const json = await response.json().catch(() => null);
          const message = json && typeof json.error === "string" ? json.error : "상태를 업데이트하지 못했습니다.";
          throw new Error(message);
        }
        const json = (await response.json()) as Record<string, unknown>;
        const updated =
          json.application && typeof json.application === "object"
            ? normalizeTrademarkApplication(json.application as Record<string, unknown>)
            : application;
        onUpdated(updated);
      } catch (err) {
        const message = err instanceof Error ? err.message : "상태 변경 중 오류가 발생했습니다.";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [application, capabilities.canManageStatuses, detail, notification, onUpdated, requiresMemo, status]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-slate-700">새 상태</label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          disabled={!capabilities.canManageStatuses}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-semibold text-slate-700">상세 메모</label>
        <textarea
          value={detail}
          onChange={(event) => setDetail(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="변경 사유나 후속 조치를 입력하세요"
        />
        {requiresMemo ? (
          <p className="mt-1 text-xs text-amber-600">이전 단계로 되돌릴 때는 메모를 반드시 작성해야 합니다.</p>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={notification}
          onChange={(event) => setNotification(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        변경 내용을 이메일/슬랙으로 알림
      </label>
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>
      ) : null}
      <button
        type="submit"
        disabled={!capabilities.canManageStatuses || isSubmitting}
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? "처리 중..." : "상태 업데이트"}
      </button>
    </form>
  );
}

type DetailDrawerProps = {
  application: AdminTrademarkRequest | null;
  open: boolean;
  onClose: () => void;
  statusOptions: StatusOption[];
  capabilities: AdminCapabilities;
  onUpdated: (updated: AdminTrademarkRequest) => void;
};

function DetailDrawer({ application, open, onClose, statusOptions, capabilities, onUpdated }: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { payments, summary, isLoading: paymentsLoading, refresh: refreshPayments } = useApplicationPayments(
    application?.id || null
  );

  useEffect(() => {
    if (open) {
      setActiveTab("overview");
    }
  }, [open, application?.id]);

  if (!application || !open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-slate-900/30 backdrop-blur-sm">
      <div className="h-full w-full max-w-4xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{application.brand_name}</h3>
            <p className="text-xs text-slate-500">관리번호 {application.management_number ?? "미배정"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-800"
          >
            닫기
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "overview", label: "개요" },
              { id: "documents", label: `서류 (${application.documents?.length || 0})` },
              { id: "timeline", label: `타임라인 (${application.timeline?.length || 0})` },
              { id: "payments", label: "결제" },
              { id: "notes", label: "노트" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  "rounded-full border px-4 py-1.5 text-xs font-medium transition",
                  activeTab === tab.id
                    ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                    : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-500"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-6 pb-10">
          {activeTab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">신청 정보</h4>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-slate-600">
                    <div>
                      <dt className="font-semibold text-slate-700">신청인</dt>
                      <dd>{application.applicant_name ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">연락처</dt>
                      <dd>{application.applicant_email ?? application.applicant_phone ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">상표 유형</dt>
                      <dd>{application.trademark_type ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">상품류</dt>
                      <dd>{application.product_classes.join(", ") || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">마지막 업데이트</dt>
                      <dd>{formatDateTime(application.updated_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">태그</dt>
                      <dd>{application.tags?.join(", ") || "-"}</dd>
                    </div>
                  </dl>
                  {application.goods_description ? (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      {application.goods_description}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">상태 변경</h4>
                  <StatusUpdateForm
                    application={application}
                    statusOptions={statusOptions}
                    capabilities={capabilities}
                    onUpdated={onUpdated}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">마감일</h4>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600">
                    <li className="flex items-center justify-between">
                      <span>결제 기한</span>
                      <span>{formatDateTime(application.deadlines?.payment)}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>서류 제출</span>
                      <span>{formatDateTime(application.deadlines?.response)}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>출원 예정</span>
                      <span>{formatDateTime(application.deadlines?.filing)}</span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">담당자 메모</h4>
                  <textarea
                    className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="내부 메모를 입력하세요"
                    rows={6}
                    defaultValue={coerceString(application.metadata["internal_note"]) ?? ""}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "documents" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900">제출 서류</h4>
                <button
                  type="button"
                  disabled={!capabilities.canUploadDocuments}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  새 파일 업로드
                </button>
              </div>
              <div className="space-y-3">
                {(!application.documents || application.documents.length === 0) ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-xs text-slate-500">
                    업로드된 서류가 없습니다.
                  </div>
                ) : (
                  application.documents.map((document) => (
                    <div
                      key={document.id}
                      className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{document.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {document.type ?? "파일"} · {formatDateTime(document.uploadedAt)}
                        </div>
                      </div>
                      {document.url ? (
                        <a
                          href={document.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600"
                        >
                          보기
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "timeline" ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900">상태 타임라인</h4>
              <ol className="space-y-3 border-l border-slate-200 pl-4">
                {(!application.timeline || application.timeline.length === 0) ? (
                  <li className="text-xs text-slate-500">아직 기록된 이벤트가 없습니다.</li>
                ) : (
                  application.timeline.map((entry) => (
                    <li key={entry.id} className="relative space-y-1 text-xs text-slate-600">
                      <span className="absolute -left-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                      <div className="font-semibold text-slate-900">{entry.label}</div>
                      <div>{entry.description}</div>
                      <div className="text-[11px] text-slate-500">
                        {entry.actorName ? `${entry.actorName} · ` : ""}
                        {formatDateTime(entry.occurredAt)}
                      </div>
                    </li>
                  ))
                )}
              </ol>
            </div>
          ) : null}

          {activeTab === "payments" ? (
            <div className="space-y-6">
              {paymentsLoading ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  결제 정보를 불러오는 중...
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm text-slate-600">등록된 결제 정보가 없습니다.</p>
                  <p className="mt-1 text-xs text-slate-500">
                    출원 단계가 진행되면 결제 정보가 생성됩니다.
                  </p>
                </div>
              ) : (
                <>
                  {/* 결제 요약 */}
                  {summary && (
                    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <h4 className="text-sm font-semibold text-slate-900">결제 요약</h4>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                        <div>
                          <dt className="text-slate-600">총 청구 금액</dt>
                          <dd className="mt-1 text-base font-semibold text-slate-900">
                            {summary.totalAmount.toLocaleString()}원
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-600">입금 금액</dt>
                          <dd className="mt-1 text-base font-semibold text-emerald-600">
                            {summary.totalPaid.toLocaleString()}원
                          </dd>
                        </div>
                        <div>
                          <dt className="text-slate-600">결제 건수</dt>
                          <dd className="mt-1 font-medium text-slate-900">{summary.paymentCount}건</dd>
                        </div>
                        <div>
                          <dt className="text-slate-600">상태</dt>
                          <dd className="mt-1">
                            {summary.allPaid ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                완납
                              </span>
                            ) : summary.hasOverdue ? (
                              <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                                연체
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                미납
                              </span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}

                  {/* 결제 단계별 카드 */}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {["filing", "office_action", "registration"].map((stage) => {
                      const payment = payments.find((p) => p.paymentStage === stage);
                      if (!payment) return null;
                      return (
                        <PaymentCard
                          key={stage}
                          payment={payment}
                          applicationId={application.id}
                          onUpdate={() => {
                            refreshPayments();
                            onUpdated(application);
                          }}
                        />
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {activeTab === "notes" ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-slate-900">내부 노트</h4>
                <textarea
                  className="mt-3 h-40 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="@담당자 멘션을 사용해 협업 메모를 남겨보세요."
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminTrademarkDashboardClient({
  admin,
  initialTrademarks,
  initialPagination,
  initialStatusSummary,
  initialFilters,
  statusOptions,
  recentActivity,
  savedFilters,
  dashboardStats,
}: AdminTrademarkDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [trademarks, setTrademarks] = useState<AdminTrademarkRequest[]>(initialTrademarks);
  const [pagination, setPagination] = useState<AdminDashboardPagination>(initialPagination);
  const [filters, setFilters] = useState<AdminDashboardFilters>(initialFilters);
  const [statusSummary, setStatusSummary] = useState<StatusSummary[]>(initialStatusSummary);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeTrademark, setActiveTrademark] = useState<AdminTrademarkRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 서버에서 새로운 데이터가 오면 state 업데이트
  useEffect(() => {
    console.log('🔍 [useEffect DEBUG] Initial data changed, updating state:', {
      newCount: initialTrademarks.length,
      currentCount: trademarks.length
    });
    setTrademarks(initialTrademarks);
    setPagination(initialPagination);
    setFilters(initialFilters);
    setStatusSummary(initialStatusSummary);
  }, [initialTrademarks, initialPagination, initialFilters, initialStatusSummary]);

  useEffect(() => {
    setSelectedIds([]);
  }, [trademarks]);

  const headerStats = useMemo(
    () => buildHeaderStats(statusSummary, pagination.totalCount),
    [statusSummary, pagination.totalCount]
  );

  const handleToggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (trademarks.length === 0) {
        return [];
      }
      const allSelected = trademarks.every((item) => prev.includes(item.id));
      return allSelected ? [] : trademarks.map((item) => item.id);
    });
  }, [trademarks]);

  const handleSelectTrademark = useCallback((trademark: AdminTrademarkRequest) => {
    setActiveTrademark(trademark);
    setDrawerOpen(true);
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      // 데이터 새로고침 로직 (API 호출 등)
      // 여기서는 일단 초기 데이터를 그대로 사용
      setTrademarks(initialTrademarks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [initialTrademarks]);

  const updateFilters = useCallback(
    async (nextFilters: AdminDashboardFilters) => {
      console.log('🔍 [updateFilters DEBUG] Updating filters:', nextFilters);
      setFilters(nextFilters);

      // URL 파라미터 구성
      const params = new URLSearchParams();

      if (nextFilters.statuses.length > 0) {
        params.set('status', nextFilters.statuses.join(','));
      }

      if (nextFilters.search) {
        params.set('search', nextFilters.search);
      }

      if (nextFilters.managementNumberSearch) {
        params.set('managementNumberSearch', nextFilters.managementNumberSearch);
      }

      if (nextFilters.customerNameSearch) {
        params.set('customerNameSearch', nextFilters.customerNameSearch);
      }

      if (nextFilters.assignedTo) {
        params.set('assignedTo', nextFilters.assignedTo);
      }

      if (nextFilters.dateRange?.field) {
        if (nextFilters.dateRange.from) {
          params.set(`${nextFilters.dateRange.field}From`, nextFilters.dateRange.from);
        }
        if (nextFilters.dateRange.to) {
          params.set(`${nextFilters.dateRange.field}To`, nextFilters.dateRange.to);
        }
      }

      // 페이지를 1로 리셋
      params.set('page', '1');

      console.log('🔍 [updateFilters DEBUG] New URL params:', params.toString());

      // URL 업데이트 (서버 사이드 렌더링 트리거)
      router.push(`/admin/trademarks?${params.toString()}`);
    },
    [router]
  );

  const applyFilters = useCallback(
    (next: AdminDashboardFilters) => {
      updateFilters(next);
    },
    [updateFilters]
  );

  const handleUpdated = useCallback(
    (updated: AdminTrademarkRequest) => {
      setActiveTrademark(updated);
      refresh();
    },
    [refresh]
  );

  const handleBulkAction = useCallback(
    async (actionId: string) => {
      if (selectedIds.length === 0) {
        return;
      }
      if (actionId === "bulk-status") {
        alert(`${selectedIds.length}건의 상태를 변경하려면 개별 상세에서 처리하세요.`);
      }
      if (actionId === "bulk-payment") {
        alert("결제 일괄 처리는 준비 중입니다.");
      }
    },
    [selectedIds]
  );

  const handleUnapprove = useCallback(
    async (item: AdminTrademarkRequest) => {
      try {
        const response = await fetch(`/api/admin/trademark-requests/${item.id}/unapprove`, {
          method: "POST",
        });

        if (!response.ok) {
          const json = await response.json();
          throw new Error(json.error || "승인 해제에 실패했습니다.");
        }

        alert(`${item.brand_name} 출원이 승인 해제되었습니다.`);
        refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "승인 해제 중 오류가 발생했습니다.";
        alert(message);
      }
    },
    [refresh]
  );

  const handleApprove = useCallback(
    async (item: AdminTrademarkRequest) => {
      try {
        const response = await fetch(`/api/admin/trademark-requests/${item.id}/approve`, {
          method: "POST",
        });

        if (!response.ok) {
          const json = await response.json();
          throw new Error(json.error || "승인에 실패했습니다.");
        }

        alert(`${item.brand_name} 신청서가 승인되었습니다.`);
        refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "승인 중 오류가 발생했습니다.";
        alert(message);
      }
    },
    [refresh]
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-80 border-r border-slate-200 bg-white/80 backdrop-blur md:block">
        <FilterSidebar
          admin={admin}
          filters={filters}
          statusOptions={statusOptions}
          statusSummary={statusSummary}
          onApply={applyFilters}
          onReset={() => updateFilters({ ...DEFAULT_FILTERS })}
          savedFilters={savedFilters}
        />
      </aside>
      <main className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6
          ">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">상표 신청 관리</h1>
              <p className="mt-1 text-sm text-slate-600">모든 상표등록 신청서를 확인하고 승인/해제할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/product-suggestions"
                className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-100"
              >
                🏷️ 상품 제안
              </Link>
              <Link
                href="/admin/stats"
                className="rounded-full border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-100"
              >
                📊 통계 및 리포트
              </Link>
              {admin.capabilities.canCreateManualEntry ? (
                <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
                  수동 신청 등록
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <section className="flex-1 overflow-y-auto px-6 py-6">
            <UnifiedTable
              items={trademarks}
              pagination={pagination}
              selectedIds={selectedIds}
              onToggleRow={handleToggleRow}
              onToggleAll={handleToggleAll}
              onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
              onApprove={handleApprove}
              onUnapprove={handleUnapprove}
              onSelectTrademark={handleSelectTrademark}
            />
          </section>
          <aside className="hidden w-80 border-l border-slate-200 bg-white/80 backdrop-blur xl:block">
            <UtilityRail
              admin={admin}
              selectedCount={selectedIds.length}
              capabilities={admin.capabilities}
              onBulkAction={handleBulkAction}
              activity={recentActivity}
            />
          </aside>
        </div>
      </main>

      <DetailDrawer
        application={activeTrademark}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        statusOptions={statusOptions}
        capabilities={admin.capabilities}
        onUpdated={handleUpdated}
      />
    </div>
  );
}

function coerceString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
}

