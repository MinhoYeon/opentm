import { useCallback, useEffect, useState } from "react";

import type { AdminTrademarkRequest, RequestsFilters, RequestsPagination } from "../types";

type UseAdminTrademarkRequestsProps = {
  initialRequests: AdminTrademarkRequest[];
  initialPagination: RequestsPagination;
  initialFilters: RequestsFilters;
};

type UseAdminTrademarkRequestsReturn = {
  requests: AdminTrademarkRequest[];
  pagination: RequestsPagination;
  filters: RequestsFilters;
  isLoading: boolean;
  error: string | null;
  updateFilters: (filters: RequestsFilters) => void;
  goToPage: (page: number) => void;
  refresh: () => void;
};

export function useAdminTrademarkRequests({
  initialRequests,
  initialPagination,
  initialFilters,
}: UseAdminTrademarkRequestsProps): UseAdminTrademarkRequestsReturn {
  const [requests, setRequests] = useState<AdminTrademarkRequest[]>(initialRequests);
  const [pagination, setPagination] = useState<RequestsPagination>(initialPagination);
  const [filters, setFilters] = useState<RequestsFilters>(initialFilters);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(
    async (page: number, currentFilters: RequestsFilters) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pagination.pageSize));

        if (currentFilters.status) {
          params.set("status", currentFilters.status);
        }
        if (currentFilters.search) {
          params.set("search", currentFilters.search);
        }

        const response = await fetch(`/api/admin/trademark-requests?${params.toString()}`);

        if (!response.ok) {
          throw new Error("신청서 목록을 불러오지 못했습니다.");
        }

        const data = await response.json();

        setRequests(data.items || []);
        setPagination({
          page: data.page || 1,
          pageSize: data.pageSize || pagination.pageSize,
          totalCount: data.total || 0,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "오류가 발생했습니다.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.pageSize]
  );

  const updateFilters = useCallback(
    (newFilters: RequestsFilters) => {
      setFilters(newFilters);
      void fetchRequests(1, newFilters);
    },
    [fetchRequests]
  );

  const goToPage = useCallback(
    (page: number) => {
      void fetchRequests(page, filters);
    },
    [fetchRequests, filters]
  );

  const refresh = useCallback(() => {
    void fetchRequests(pagination.page, filters);
  }, [fetchRequests, pagination.page, filters]);

  return {
    requests,
    pagination,
    filters,
    isLoading,
    error,
    updateFilters,
    goToPage,
    refresh,
  };
}
