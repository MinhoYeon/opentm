"use client";

import { useCallback, useEffect, useState } from "react";
import type { TrademarkPayment } from "@/types/trademark";

type PaymentsSummary = {
  totalAmount: number;
  totalPaid: number;
  hasOverdue: boolean;
  allPaid: boolean;
  paymentCount: number;
};

type ApplicationPaymentsResponse = {
  application: {
    id: string;
    brandName: string;
    status: string;
  };
  payments: TrademarkPayment[];
  summary: PaymentsSummary;
};

export function useApplicationPayments(applicationId: string | null) {
  const [payments, setPayments] = useState<TrademarkPayment[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!applicationId) {
      setPayments([]);
      setSummary(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/payments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Failed to fetch payments");
      }

      const data: ApplicationPaymentsResponse = await response.json();
      setPayments(data.payments || []);
      setSummary(data.summary || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load payments";
      setError(message);
      console.error("Error fetching payments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const refresh = useCallback(() => {
    return fetchPayments();
  }, [fetchPayments]);

  return {
    payments,
    summary,
    isLoading,
    error,
    refresh,
  };
}
