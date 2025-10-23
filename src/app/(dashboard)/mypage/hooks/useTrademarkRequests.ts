"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

import { createBrowserClient } from "@/lib/supabaseBrowserClient";

import type { TrademarkRequest } from "../types";
import { normalizeTrademarkRequest } from "../utils/normalizeTrademarkRequest";

type UseTrademarkRequestsOptions = {
  initialRequests: TrademarkRequest[];
  userId: string;
};

type StatusUpdateResult = PostgrestSingleResponse<Record<string, unknown>>;

export function useTrademarkRequests({ initialRequests, userId }: UseTrademarkRequestsOptions) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [requests, setRequests] = useState<TrademarkRequest[]>(initialRequests);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousRef = useRef<TrademarkRequest[]>(initialRequests);

  useEffect(() => {
    setRequests(initialRequests);
    previousRef.current = initialRequests;
  }, [initialRequests]);

  const refresh = useCallback(async () => {
    setIsMutating(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("trademark_requests")
        .select("*")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      const normalized = (data ?? []).map((row) =>
        normalizeTrademarkRequest(row as Record<string, unknown>)
      );
      setRequests(normalized);
      previousRef.current = normalized;
      return normalized;
    } catch (err) {
      const message = err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.";
      setError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [supabase, userId]);

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
    error,
  };
}
