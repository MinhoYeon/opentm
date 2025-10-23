"use client";

import { useCallback, useMemo, useState } from "react";

import { createBrowserClient } from "@/lib/supabaseBrowserClient";
import { normalizeTrademarkRequest } from "@/app/(dashboard)/mypage/utils/normalizeTrademarkRequest";
import type { TrademarkRequest } from "@/app/(dashboard)/mypage/types";

type CreateTrademarkInput = {
  userId: string;
  brandName: string;
  trademarkType: string;
  productClasses: string[];
  representativeEmail: string;
  additionalNotes?: string;
  image?: {
    publicUrl: string;
    storagePath: string;
    name: string;
    type: string;
    size: number;
  } | null;
};

type CreateTrademarkState = {
  isSubmitting: boolean;
  error: string | null;
  result: TrademarkRequest | null;
};

const initialState: CreateTrademarkState = {
  isSubmitting: false,
  error: null,
  result: null,
};

export function useCreateTrademarkRequest() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [state, setState] = useState<CreateTrademarkState>(initialState);

  const submit = useCallback(
    async (input: CreateTrademarkInput) => {
      if (state.isSubmitting) {
        return null;
      }

      if (!input.brandName.trim()) {
        setState({ isSubmitting: false, error: "상표명을 입력해 주세요.", result: null });
        return null;
      }

      if (!input.trademarkType) {
        setState({ isSubmitting: false, error: "상표 유형을 선택해 주세요.", result: null });
        return null;
      }

      setState((prev) => ({ ...prev, isSubmitting: true, error: null, result: null }));

      const submittedAt = new Date().toISOString();
      const payload = {
        user_id: input.userId,
        brand_name: input.brandName.trim(),
        trademark_type: input.trademarkType,
        product_classes: input.productClasses,
        representative_email: input.representativeEmail.trim(),
        additional_notes: input.additionalNotes?.trim() || null,
        image_url: input.image?.publicUrl ?? null,
        image_storage_path: input.image?.storagePath ?? null,
        submitted_at: submittedAt,
        status: "awaiting_payment",
        status_label: "입금 대기",
        status_description: "가상계좌 입금을 기다리고 있습니다.",
        status_badge_class: "bg-amber-100 text-amber-700",
        status_dot_class: "bg-amber-500",
        status_updated_at: submittedAt,
      };

      try {
        const { data, error } = await supabase
          .from("trademark_requests")
          .insert(payload)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        const normalized = normalizeTrademarkRequest((data ?? {}) as Record<string, unknown>);
        setState({ isSubmitting: false, error: null, result: normalized });
        return normalized;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "상표 출원 요청을 저장하는 중 오류가 발생했습니다.";
        setState({ isSubmitting: false, error: message, result: null });
        return null;
      }
    },
    [state.isSubmitting, supabase]
  );

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    submit,
    reset,
  };
}
