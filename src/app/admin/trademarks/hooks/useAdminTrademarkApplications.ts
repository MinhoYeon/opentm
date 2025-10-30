"use client";

import { useCallback, useMemo, useState } from "react";

import type {
  AdminDashboardFilters,
  AdminDashboardPagination,
  AdminTrademarkApplication,
  StatusSummary,
} from "../types";
import { normalizeTrademarkApplication } from "../utils/normalizeTrademarkApplication";

function createStatusSummary(applications: AdminTrademarkApplication[]): StatusSummary[] {
  const counts = new Map<string, number>();
  applications.forEach((application) => {
    const status = application.status;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });
  return Array.from(counts.entries()).map(([status, count]) => ({
    status: status as StatusSummary["status"],
    count,
  }));
}

function buildQueryParams(
  filters: AdminDashboardFilters,
  page: number,
  pageSize: number
): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(pageSize));

  if (filters.statuses.length > 0) {
    params.set("status", filters.statuses.join(","));
  }

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.managementNumberSearch) {
    params.set("managementNumberSearch", filters.managementNumberSearch);
  }

  if (filters.customerNameSearch) {
    params.set("customerNameSearch", filters.customerNameSearch);
  }

  if (filters.assignedTo) {
    params.set("assignedTo", filters.assignedTo);
  }

  if (filters.dateRange?.from) {
    params.set(`${filters.dateRange.field}From`, filters.dateRange.from);
  }

  if (filters.dateRange?.to) {
    params.set(`${filters.dateRange.field}To`, filters.dateRange.to);
  }

  if (filters.paymentStates.length > 0) {
    params.set("paymentStates", filters.paymentStates.join(","));
  }

  if (filters.tags.length > 0) {
    params.set("tags", filters.tags.join(","));
  }

  return params;
}

export type UseAdminTrademarkApplicationsOptions = {
  initialApplications: AdminTrademarkApplication[];
  initialPagination: AdminDashboardPagination;
  initialStatusSummary?: StatusSummary[];
  initialFilters: AdminDashboardFilters;
};

export function useAdminTrademarkApplications({
  initialApplications,
  initialPagination,
  initialStatusSummary,
  initialFilters,
}: UseAdminTrademarkApplicationsOptions) {
  const [applications, setApplications] = useState<AdminTrademarkApplication[]>(initialApplications);
  const [pagination, setPagination] = useState<AdminDashboardPagination>(initialPagination);
  const [filters, setFilters] = useState<AdminDashboardFilters>(initialFilters);
  const [statusSummary, setStatusSummary] = useState<StatusSummary[]>(
    initialStatusSummary ?? createStatusSummary(initialApplications)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentSummary = useMemo(() => {
    const totals = new Map<string, { count: number; amount: number }>();
    applications.forEach((application) => {
      const state = application.payment.state;
      const current = totals.get(state) ?? { count: 0, amount: 0 };
      current.count += 1;
      current.amount += application.payment.amount ?? 0;
      totals.set(state, current);
    });
    return totals;
  }, [applications]);

  const fetchApplications = useCallback(
    async (nextFilters: AdminDashboardFilters, nextPage: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const params = buildQueryParams(nextFilters, nextPage, pagination.pageSize);
        console.log('🔍 [DEBUG] Fetching with filters:', nextFilters);
        console.log('🔍 [DEBUG] Query params:', params.toString());

        const response = await fetch(`/api/trademarks?${params.toString()}`, {
          method: "GET",
          headers: {
            accept: "application/json",
          },
          cache: "no-store",
        });

        console.log('🔍 [DEBUG] Response status:', response.status);

        if (!response.ok) {
          const message = await response
            .json()
            .then((json) => (json && typeof json.error === "string" ? json.error : null))
            .catch(() => null);
          throw new Error(message ?? "신청 목록을 불러오지 못했습니다.");
        }

        const json = (await response.json()) as Record<string, unknown>;
        console.log('🔍 [DEBUG] Response data:', {
          total: json.total,
          itemCount: Array.isArray(json.items) ? json.items.length : 0
        });

        const items = Array.isArray(json.items) ? (json.items as Record<string, unknown>[]) : [];
        const normalized = items.map((item) => normalizeTrademarkApplication(item));

        const total = typeof json.total === "number" ? json.total : normalized.length;
        const pageSize = typeof json.pageSize === "number" ? json.pageSize : pagination.pageSize;
        const page = typeof json.page === "number" ? json.page : nextPage;

        setApplications(normalized);
        setPagination({ page, pageSize, totalCount: total });
        if (Array.isArray(json.statusSummary)) {
          setStatusSummary(
            (json.statusSummary as Record<string, unknown>[]).map((item) => ({
              status: String(item.status ?? "draft") as StatusSummary["status"],
              count: typeof item.count === "number" ? item.count : 0,
            }))
          );
        } else {
          setStatusSummary(createStatusSummary(normalized));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "데이터를 불러올 수 없습니다.";
        console.error('❌ [DEBUG] Fetch error:', err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.pageSize]
  );

  const updateFilters = useCallback(
    async (nextFilters: AdminDashboardFilters) => {
      setFilters(nextFilters);
      await fetchApplications(nextFilters, 1);
    },
    [fetchApplications]
  );

  const goToPage = useCallback(
    async (page: number) => {
      await fetchApplications(filters, page);
    },
    [fetchApplications, filters]
  );

  const refresh = useCallback(async () => {
    await fetchApplications(filters, pagination.page);
  }, [fetchApplications, filters, pagination.page]);

  return {
    applications,
    pagination,
    filters,
    statusSummary,
    paymentSummary,
    isLoading,
    error,
    updateFilters,
    goToPage,
    refresh,
    setFilters,
  };
}

