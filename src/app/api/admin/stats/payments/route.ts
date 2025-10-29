import { NextResponse } from "next/server";

import type {
  MonthlyPaymentStats,
  OverdueAnalysis,
  PaymentStageStats,
  PaymentStatsResponse,
} from "@/types/stats";
import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";

/**
 * GET /api/admin/stats/payments
 * 결제 통계 조회 (월별 입금 현황, 단계별 결제 현황, 연체율 분석)
 */
export async function GET(request: Request) {
  try {
    // 관리자 권한 확인
    await requireAdminContext();

    const adminClient = createAdminClient();

    // URL 파라미터 파싱
    const { searchParams } = new URL(request.url);
    const monthsBack = parseInt(searchParams.get("months") || "12", 10);

    // 모든 결제 데이터 조회
    const { data: payments, error } = await adminClient
      .from("trademark_payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch payments for stats:", error);
      return NextResponse.json({ error: "결제 데이터를 불러올 수 없습니다." }, { status: 500 });
    }

    const now = new Date();

    // 기본 통계 계산
    let totalAmount = 0;
    let totalPaid = 0;
    let totalUnpaid = 0;
    let overdueCount = 0;
    let refundCount = 0;

    const stageMap = new Map<string, PaymentStageStats>();
    const monthMap = new Map<string, MonthlyPaymentStats>();
    let totalDaysOverdue = 0;
    let overduePaymentsForAverage = 0;
    const overdueByStageMap = { filing: 0, office_action: 0, registration: 0 };

    for (const payment of payments || []) {
      const amount = typeof payment.amount === "number" ? payment.amount : 0;
      const paidAmount = typeof payment.paid_amount === "number" ? payment.paid_amount : 0;
      const status = payment.payment_status as string;
      const stage = payment.payment_stage as "filing" | "office_action" | "registration";
      const dueAt = payment.due_at ? new Date(payment.due_at as string) : null;
      const paidAt = payment.paid_at ? new Date(payment.paid_at as string) : null;

      totalAmount += amount;
      totalPaid += paidAmount;

      const isPaid = status === "paid";
      const isOverdue = !isPaid && dueAt && dueAt < now;

      if (!isPaid) {
        totalUnpaid += amount - paidAmount;
      }

      if (isOverdue) {
        overdueCount += 1;
        if (dueAt) {
          const daysOverdue = Math.floor((now.getTime() - dueAt.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysOverdue += daysOverdue;
          overduePaymentsForAverage += 1;
        }
        overdueByStageMap[stage] = (overdueByStageMap[stage] || 0) + 1;
      }

      if (status === "refund_requested" || status === "refunded") {
        refundCount += 1;
      }

      // 단계별 통계
      const stageLabel =
        stage === "filing" ? "출원비" : stage === "office_action" ? "중간비용" : "등록비";

      if (!stageMap.has(stage)) {
        stageMap.set(stage, {
          stage,
          stageLabel,
          totalCount: 0,
          paidCount: 0,
          unpaidCount: 0,
          overdueCount: 0,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
        });
      }

      const stageStat = stageMap.get(stage)!;
      stageStat.totalCount += 1;
      stageStat.totalAmount += amount;
      stageStat.paidAmount += paidAmount;

      if (isPaid) {
        stageStat.paidCount += 1;
      } else {
        stageStat.unpaidCount += 1;
        stageStat.unpaidAmount += amount - paidAmount;
      }

      if (isOverdue) {
        stageStat.overdueCount += 1;
      }

      // 월별 통계 (입금일 기준, 없으면 생성일 기준)
      const dateForMonth = paidAt || new Date(payment.created_at as string);
      const monthKey = `${dateForMonth.getFullYear()}-${String(dateForMonth.getMonth() + 1).padStart(2, "0")}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          month: monthKey,
          totalAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0,
          paymentCount: 0,
          paidCount: 0,
        });
      }

      const monthStat = monthMap.get(monthKey)!;
      monthStat.paymentCount += 1;
      monthStat.totalAmount += amount;

      if (isPaid) {
        monthStat.paidAmount += paidAmount;
        monthStat.paidCount += 1;
      } else {
        monthStat.unpaidAmount += amount - paidAmount;
      }
    }

    // 연체율 분석
    const totalPayments = payments?.length || 0;
    const overdueRate = totalPayments > 0 ? (overdueCount / totalPayments) * 100 : 0;
    const averageDaysOverdue =
      overduePaymentsForAverage > 0 ? totalDaysOverdue / overduePaymentsForAverage : 0;

    const overdueAnalysis: OverdueAnalysis = {
      totalPayments,
      overduePayments: overdueCount,
      overdueRate: Math.round(overdueRate * 100) / 100,
      averageDaysOverdue: Math.round(averageDaysOverdue * 10) / 10,
      totalOverdueAmount: totalUnpaid,
      overdueByStage: overdueByStageMap,
    };

    // 최근 N개월 데이터만 포함
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    const cutoffMonthKey = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, "0")}`;

    const byMonth = Array.from(monthMap.values())
      .filter((m) => m.month >= cutoffMonthKey)
      .sort((a, b) => a.month.localeCompare(b.month));

    const byStage = Array.from(stageMap.values()).sort((a, b) => {
      const order = ["filing", "office_action", "registration"];
      return order.indexOf(a.stage) - order.indexOf(b.stage);
    });

    const response: PaymentStatsResponse = {
      overview: {
        totalPayments,
        totalAmount,
        totalPaid,
        totalUnpaid,
        overdueCount,
        refundCount,
      },
      byStage,
      byMonth,
      overdueAnalysis,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET /api/admin/stats/payments:", error);
    const message = error instanceof Error ? error.message : "통계를 생성할 수 없습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
