import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import { sendPaymentReminderNotification } from "@/lib/email/notifications";
import { getPaymentStageLabel } from "@/types/trademark";

/**
 * POST /api/admin/notifications/payment-reminders
 * 결제 기한 임박/초과 알림 전송
 *
 * Query params:
 * - daysBeforeDue: 기한 전 며칠에 알림을 보낼지 (기본값: 3)
 * - includeOverdue: 연체된 결제도 포함할지 (기본값: true)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdminContext();
    const adminClient = createAdminClient();

    const { searchParams } = new URL(request.url);
    const daysBeforeDue = parseInt(searchParams.get("daysBeforeDue") || "3", 10);
    const includeOverdue = searchParams.get("includeOverdue") !== "false";

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysBeforeDue);

    // 결제 기한이 임박했거나 초과된 결제 조회
    let query = adminClient
      .from("trademark_payments")
      .select(`
        *,
        trademark_applications!inner (
          id,
          brand_name,
          management_number,
          applicant_name,
          applicant_email
        )
      `)
      .not("payment_status", "eq", "paid")
      .not("payment_status", "eq", "refunded")
      .not("due_at", "is", null);

    if (includeOverdue) {
      // 기한이 지났거나 임박한 경우
      query = query.lte("due_at", futureDate.toISOString());
    } else {
      // 기한이 임박한 경우만
      query = query
        .gte("due_at", now.toISOString())
        .lte("due_at", futureDate.toISOString());
    }

    const { data: payments, error } = await query;

    if (error) {
      console.error("Failed to fetch payments for reminders:", error);
      return NextResponse.json({ error: "결제 정보를 불러올 수 없습니다." }, { status: 500 });
    }

    if (!payments || payments.length === 0) {
      return NextResponse.json({
        message: "알림을 보낼 결제가 없습니다.",
        sent: 0,
        failed: 0,
        total: 0,
      });
    }

    const results: Array<{ paymentId: string; success: boolean; error?: string }> = [];

    // 각 결제에 대해 알림 전송
    for (const payment of payments) {
      const application = Array.isArray(payment.trademark_applications)
        ? payment.trademark_applications[0]
        : payment.trademark_applications;

      if (!application || !application.applicant_email) {
        results.push({
          paymentId: payment.id,
          success: false,
          error: "신청인 이메일이 없습니다.",
        });
        continue;
      }

      const dueDate = new Date(payment.due_at);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const amount = typeof payment.amount === "number" ? payment.amount : 0;
      const paidAmount = typeof payment.paid_amount === "number" ? payment.paid_amount : 0;
      const unpaidAmount = Math.max(0, amount - paidAmount);

      try {
        const emailResult = await sendPaymentReminderNotification({
          applicantName: application.applicant_name || "고객님",
          applicantEmail: application.applicant_email,
          brandName: application.brand_name,
          paymentStage: payment.payment_stage,
          paymentStageLabel: getPaymentStageLabel(payment.payment_stage),
          amount,
          unpaidAmount,
          currency: payment.currency || "KRW",
          dueDate: payment.due_at,
          daysUntilDue,
          managementNumber: application.management_number,
        });

        if (emailResult.success) {
          results.push({ paymentId: payment.id, success: true });
          console.log(`Sent payment reminder to ${application.applicant_email} (${daysUntilDue} days until due)`);
        } else {
          results.push({
            paymentId: payment.id,
            success: false,
            error: emailResult.error,
          });
        }
      } catch (emailError) {
        console.error("Failed to send payment reminder:", emailError);
        results.push({
          paymentId: payment.id,
          success: false,
          error: emailError instanceof Error ? emailError.message : "이메일 전송 실패",
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `${succeeded}개 알림 전송 완료 (${failed}개 실패)`,
      sent: succeeded,
      failed,
      total: payments.length,
      details: results,
    });
  } catch (error) {
    console.error("Error in POST /api/admin/notifications/payment-reminders:", error);
    const message = error instanceof Error ? error.message : "알림 전송에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
