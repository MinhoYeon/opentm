"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  type AdminActivityLog,
  type AdminDashboardFilters,
  type AdminDashboardPagination,
  type AdminTrademarkApplication,
  type AdminUserSummary,
  type SavedFilter,
  type StatusSummary,
} from "./types";
import { useAdminTrademarkApplications } from "./hooks/useAdminTrademarkApplications";
import { normalizeTrademarkApplication } from "./utils/normalizeTrademarkApplication";
import type { AdminCapabilities } from "@/lib/admin/roles";
import { TRADEMARK_STATUS_VALUES } from "@/types/status";

const DEFAULT_FILTERS: AdminDashboardFilters = {
  statuses: [],
  paymentStates: [],
  tags: [],
  search: "",
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
  initialApplications: AdminTrademarkApplication[];
  initialPagination: AdminDashboardPagination;
  initialStatusSummary: StatusSummary[];
  initialFilters: AdminDashboardFilters;
  statusOptions: StatusOption[];
  recentActivity: AdminActivityLog[];
  savedFilters?: SavedFilter[];
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
  onApply: (filters: AdminDashboardFilters) => void;
  onReset: () => void;
  savedFilters?: SavedFilter[];
};

function FilterSidebar({ admin, filters, statusOptions, onApply, onReset, savedFilters }: FilterSidebarProps) {
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
        return { ...prev, statuses };
      });
    },
    []
  );

  const togglePaymentState = useCallback((state: string) => {
    setLocalFilters((prev) => {
      const exists = prev.paymentStates.includes(state);
      const paymentStates = exists
        ? prev.paymentStates.filter((item) => item !== state)
        : [...prev.paymentStates, state];
      return { ...prev, paymentStates };
    });
  }, []);

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
    onApply(localFilters);
  }, [localFilters, onApply]);

  const handleReset = useCallback(() => {
    setLocalFilters({ ...DEFAULT_FILTERS });
    setSelectedSavedFilter(null);
    onReset();
  }, [onReset]);

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
        <label className="text-xs font-semibold text-slate-700">검색</label>
        <input
          type="search"
          value={localFilters.search ?? ""}
          onChange={(event) =>
            setLocalFilters((prev) => ({ ...prev, search: event.target.value }))
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="신청자, 상표명, 관리번호 검색"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-700">상태</p>
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => {
            const active = localFilters.statuses.includes(option.value);
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
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-700">결제 상태</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "unpaid", label: "미입금" },
            { value: "paid", label: "입금 완료" },
            { value: "partial", label: "부분 입금" },
            { value: "refund_requested", label: "환불 요청" },
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="담당자 이메일 또는 ID"
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="VIP, 우선심사 등"
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
          <option value="filed_at">출원일</option>
          <option value="status_updated_at">상태 변경</option>
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
                  </tr>
                );
              })}
              {applications.length === 0 && !isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center" colSpan={8}>
                    <div className="text-sm text-slate-600">조건에 맞는 신청이 없습니다.</div>
                    <div className="mt-2 text-xs text-slate-500">
                      필터를 조정해 보거나, 데이터베이스에 상표등록 신청 데이터가 있는지 확인해주세요.
                    </div>
                  </td>
                </tr>
              ) : null}
              {isLoading ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={8}>
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
  application: AdminTrademarkApplication;
  statusOptions: StatusOption[];
  capabilities: AdminCapabilities;
  onUpdated: (updated: AdminTrademarkApplication) => void;
};

function StatusUpdateForm({ application, statusOptions, capabilities, onUpdated }: StatusUpdateFormProps) {
  const [status, setStatus] = useState(application.status);
  const [detail, setDetail] = useState(application.statusDetail ?? "");
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
    setDetail(application.statusDetail ?? "");
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
  application: AdminTrademarkApplication | null;
  open: boolean;
  onClose: () => void;
  statusOptions: StatusOption[];
  capabilities: AdminCapabilities;
  onUpdated: (updated: AdminTrademarkApplication) => void;
};

function DetailDrawer({ application, open, onClose, statusOptions, capabilities, onUpdated }: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");
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
            <h3 className="text-lg font-semibold text-slate-900">{application.brandName}</h3>
            <p className="text-xs text-slate-500">관리번호 {application.managementNumber ?? "미배정"}</p>
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
              { id: "documents", label: `서류 (${application.documents.length})` },
              { id: "timeline", label: `타임라인 (${application.timeline.length})` },
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
                      <dd>{application.applicantName ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">연락처</dt>
                      <dd>{application.applicantEmail ?? application.applicantPhone ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">상표 유형</dt>
                      <dd>{application.trademarkType ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">상품류</dt>
                      <dd>{application.productClasses.join(", ") || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">마지막 업데이트</dt>
                      <dd>{formatDateTime(application.lastTouchedAt ?? application.updatedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">태그</dt>
                      <dd>{application.tags.join(", ") || "-"}</dd>
                    </div>
                  </dl>
                  {application.goodsDescription ? (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                      {application.goodsDescription}
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
                      <span>{formatDateTime(application.deadlines.payment)}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>서류 제출</span>
                      <span>{formatDateTime(application.deadlines.response)}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>출원 예정</span>
                      <span>{formatDateTime(application.deadlines.filing)}</span>
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
                {application.documents.length === 0 ? (
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
                {application.timeline.length === 0 ? (
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
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">결제 내역</h4>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-600">
                    <div>
                      <dt className="font-semibold text-slate-700">금액</dt>
                      <dd>{formatCurrency(application.payment.amount, application.payment.currency ?? "KRW")}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">결제 상태</dt>
                      <dd>{application.payment.state}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">입금 기한</dt>
                      <dd>{formatDateTime(application.payment.dueAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">입금 확인</dt>
                      <dd>{formatDateTime(application.payment.receivedAt)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">참조 번호</dt>
                      <dd>{application.payment.reference ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-slate-700">입금자명</dt>
                      <dd>{application.payment.remitterName ?? "-"}</dd>
                    </div>
                  </dl>
                </div>
                {capabilities.canManagePayments ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-900">무통장 입금 확인</h4>
                    <p className="mt-1 text-xs text-slate-600">
                      입금자명과 금액을 확인하고 일치하는 경우 &quot;입금 확인&quot;을 클릭하세요.
                    </p>
                    <button
                      type="button"
                      className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
                      onClick={() => onUpdated({ ...application, payment: { ...application.payment, state: "paid" } })}
                    >
                      입금 확인 처리
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">결제 관련 메모</h4>
                  <textarea
                    className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    rows={8}
                    defaultValue={coerceString(application.metadata["payment_note"]) ?? ""}
                  />
                </div>
              </div>
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
  initialApplications,
  initialPagination,
  initialStatusSummary,
  initialFilters,
  statusOptions,
  recentActivity,
  savedFilters,
}: AdminTrademarkDashboardClientProps) {
  const {
    applications,
    pagination,
    filters,
    statusSummary,
    isLoading,
    error,
    updateFilters,
    goToPage,
    refresh,
  } = useAdminTrademarkApplications({
    initialApplications,
    initialPagination,
    initialStatusSummary,
    initialFilters,
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeApplication, setActiveApplication] = useState<AdminTrademarkApplication | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setSelectedIds([]);
  }, [applications]);

  const headerStats = useMemo(
    () => buildHeaderStats(statusSummary, pagination.totalCount),
    [statusSummary, pagination.totalCount]
  );

  const handleToggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (applications.length === 0) {
        return [];
      }
      const allSelected = applications.every((app) => prev.includes(app.id));
      return allSelected ? [] : applications.map((app) => app.id);
    });
  }, [applications]);

  const handleSelectApplication = useCallback((application: AdminTrademarkApplication) => {
    setActiveApplication(application);
    setDrawerOpen(true);
  }, []);

  const handleUpdated = useCallback(
    (updated: AdminTrademarkApplication) => {
      setActiveApplication(updated);
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

  const applyFilters = useCallback(
    (next: AdminDashboardFilters) => {
      updateFilters(next);
    },
    [updateFilters]
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-80 border-r border-slate-200 bg-white/80 backdrop-blur md:block">
        <FilterSidebar
          admin={admin}
          filters={filters}
          statusOptions={statusOptions}
          onApply={applyFilters}
          onReset={() => updateFilters({ ...DEFAULT_FILTERS })}
          savedFilters={savedFilters}
        />
      </aside>
      <main className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 px-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">상표 신청 관리</h1>
              <p className="text-sm text-slate-600">필터, 상태 변경, 결제 확인을 한 화면에서 처리하세요.</p>
            </div>
            {admin.capabilities.canCreateManualEntry ? (
              <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500">
                수동 신청 등록
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 px-6 md:grid-cols-2 xl:grid-cols-4">
            {headerStats.map((stat) => (
              <div key={stat.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-xs text-slate-500">{stat.label}</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-2xl font-semibold text-slate-900">{stat.value.toLocaleString()}</div>
                  <span className={classNames("rounded-full px-3 py-1 text-[11px] font-semibold", stat.accentClass)}>
                    {stat.description}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <section className="flex-1 overflow-y-auto px-6 py-6">
            <ApplicationsTable
              applications={applications}
              pagination={pagination}
              selectedIds={selectedIds}
              onToggleRow={handleToggleRow}
              onToggleAll={handleToggleAll}
              onSelectApplication={handleSelectApplication}
              onPageChange={goToPage}
              isLoading={isLoading}
              error={error}
              onRefresh={refresh}
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
        application={activeApplication}
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

