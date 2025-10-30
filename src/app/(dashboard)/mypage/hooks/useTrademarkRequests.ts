"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import { createBrowserClient } from "@/lib/supabaseBrowserClient";

import type { TrademarkRequest } from "../types";
import { normalizeTrademarkRequest } from "../utils/normalizeTrademarkRequest";

type UseTrademarkRequestsOptions = {
  initialRequests: TrademarkRequest[];
  userId: string;
  statusFilter?: string;
  searchTerm?: string;
  managementNumberSearch?: string;
  applicantNameSearch?: string;
};

type StatusUpdateResult = PostgrestSingleResponse<Record<string, unknown>>;

export function useTrademarkRequests({
  initialRequests,
  userId,
  statusFilter = "all",
  searchTerm = "",
  managementNumberSearch = "",
  applicantNameSearch = "",
}: UseTrademarkRequestsOptions) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [requests, setRequests] = useState<TrademarkRequest[]>(initialRequests);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const previousRef = useRef<TrademarkRequest[]>(initialRequests);
  const initializedRef = useRef(false);

  useEffect(() => {
    setRequests(initialRequests);
    previousRef.current = initialRequests;
  }, [initialRequests]);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("trademark_requests")
        .select(`
          *,
          trademark_request_applicants(
            applicant_id,
            applicants(
              name_korean,
              display_name
            )
          )
        `)
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // 상표명 검색
      const trimmedBrandName = searchTerm.trim();
      if (trimmedBrandName) {
        const escaped = trimmedBrandName.replace(/[%_]/g, "\\$&");
        query = query.ilike("brand_name", `%${escaped}%`);
      }

      // 관리번호 검색
      const trimmedManagementNumber = managementNumberSearch.trim();
      if (trimmedManagementNumber) {
        const escaped = trimmedManagementNumber.replace(/[%_]/g, "\\$&");
        query = query.ilike("management_number", `%${escaped}%`);
      }

      // 출원인명 검색 - applicant_name 필드로 검색
      const trimmedApplicantName = applicantNameSearch.trim();
      if (trimmedApplicantName) {
        const escaped = trimmedApplicantName.replace(/[%_]/g, "\\$&");
        query = query.ilike("applicant_name", `%${escaped}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      const normalized = (data ?? []).map((row) => {
        const rowData = row as Record<string, unknown>;
        // Extract applicant names from joined data
        let applicantName: string | null = rowData.applicant_name as string | null;
        if (Array.isArray(rowData.trademark_request_applicants) && rowData.trademark_request_applicants.length > 0) {
          const applicantNames = rowData.trademark_request_applicants
            .map((applicantItem) => {
              const applicantRecord = applicantItem as Record<string, unknown>;
              if (applicantRecord && typeof applicantRecord.applicants === "object" && applicantRecord.applicants !== null) {
                const applicantData = applicantRecord.applicants as Record<string, unknown>;
                return (
                  (typeof applicantData.name_korean === "string" ? applicantData.name_korean : null) ||
                  (typeof applicantData.display_name === "string" ? applicantData.display_name : null)
                );
              }
              return null;
            })
            .filter((name): name is string => name !== null);

          if (applicantNames.length > 0) {
            applicantName = applicantNames.join(", ");
          }
        }
        return normalizeTrademarkRequest({ ...rowData, applicant_name: applicantName });
      });
      setRequests(normalized);
      previousRef.current = normalized;
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, userId, statusFilter, searchTerm, managementNumberSearch, applicantNameSearch]);

  const refresh = useCallback(async () => {
    return fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const isDefaultFilter =
        statusFilter === "all" &&
        !searchTerm.trim() &&
        !managementNumberSearch.trim() &&
        !applicantNameSearch.trim();
      if (isDefaultFilter) {
        return;
      }
    }

    fetchRequests().catch((err) => {
      console.error("Failed to fetch trademark requests", err);
    });
  }, [fetchRequests, searchTerm, statusFilter, managementNumberSearch, applicantNameSearch]);

  const updateStatus = useCallback(
    async (requestId: string, nextStatus: string) => {
      const previous = previousRef.current;
      const optimisticTimestamp = new Date().toISOString();
      setError(null);
      setIsMutating(true);

      const optimistic = requests.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: nextStatus,
              statusLabel: item.statusLabel ?? null,
              lastUpdated: optimisticTimestamp,
            }
          : item
      );
      setRequests(optimistic);
      previousRef.current = optimistic;

      try {
        const response: StatusUpdateResult = await supabase
          .from("trademark_requests")
          .update({ status: nextStatus, status_updated_at: optimisticTimestamp })
          .eq("id", requestId)
          .eq("user_id", userId)
          .select("*")
          .single();

        if (response.error) {
          throw response.error;
        }

        const normalized = normalizeTrademarkRequest(
          (response.data ?? {}) as Record<string, unknown>
        );
        setRequests((current) =>
          current.map((item) => (item.id === requestId ? { ...item, ...normalized } : item))
        );
        previousRef.current = previousRef.current.map((item) =>
          item.id === requestId ? { ...item, ...normalized } : item
        );
        return normalized;
      } catch (err) {
        setRequests(previous);
        previousRef.current = previous;
        const message = err instanceof Error ? err.message : "상태를 변경하지 못했습니다.";
        setError(message);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [requests, supabase, userId]
  );

  return {
    requests,
    refresh,
    updateStatus,
    isMutating,
    isLoading,
    error,
  };
}
