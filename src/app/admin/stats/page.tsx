import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import type { PaymentStatsResponse } from "@/types/stats";

import StatsPageClient from "./StatsPageClient";

export default async function AdminStatsPage() {
  const { context: adminContext } = await requireAdminContext();
  const adminClient = createAdminClient();

  // 통계 데이터 조회
  let stats: PaymentStatsResponse | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/admin/stats/payments`, {
      headers: {
        Cookie: "", // 서버 사이드에서는 쿠키를 직접 전달해야 할 수 있음
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("통계 데이터를 불러올 수 없습니다.");
    }

    stats = await response.json() as PaymentStatsResponse;
  } catch (err) {
    console.error("Failed to load stats:", err);
    error = err instanceof Error ? err.message : "통계 데이터를 불러올 수 없습니다.";

    // Fallback: API 직접 호출 대신 데이터베이스에서 직접 조회
    try {
      const { data: payments } = await adminClient
        .from("trademark_payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (payments) {
        // 간단한 통계 계산
        const now = new Date();
        let totalAmount = 0;
        let totalPaid = 0;
        let totalUnpaid = 0;
        let overdueCount = 0;

        for (const p of payments) {
          const amount = typeof p.amount === "number" ? p.amount : 0;
          const paidAmount = typeof p.paid_amount === "number" ? p.paid_amount : 0;
          const status = p.payment_status as string;
          const dueAt = p.due_at ? new Date(p.due_at as string) : null;

          totalAmount += amount;
          totalPaid += paidAmount;

          if (status !== "paid") {
            totalUnpaid += amount - paidAmount;
            if (dueAt && dueAt < now) {
              overdueCount += 1;
            }
          }
        }

        stats = {
          overview: {
            totalPayments: payments.length,
            totalAmount,
            totalPaid,
            totalUnpaid,
            overdueCount,
            refundCount: 0,
          },
          byStage: [],
          byMonth: [],
          overdueAnalysis: {
            totalPayments: payments.length,
            overduePayments: overdueCount,
            overdueRate: payments.length > 0 ? (overdueCount / payments.length) * 100 : 0,
            averageDaysOverdue: 0,
            totalOverdueAmount: totalUnpaid,
            overdueByStage: { filing: 0, office_action: 0, registration: 0 },
          },
          generatedAt: new Date().toISOString(),
        };
        error = null;
      }
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
    }
  }

  return (
    <StatsPageClient
      initialStats={stats}
      error={error}
      adminRole={adminContext.role}
    />
  );
}
