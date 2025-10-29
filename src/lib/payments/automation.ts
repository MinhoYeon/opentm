/**
 * Payment automation and state transitions
 *
 * Automatic state transitions triggered by payment events
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TrademarkStatus } from "@/types/status";
import type { PaymentStage } from "@/types/trademark";
import { isPaymentStageCompleted } from "./utils";

/**
 * Payment stage to case status transition map
 * Defines which case status should be set when a payment stage is completed
 */
const PAYMENT_COMPLETION_TRANSITIONS: Record<PaymentStage, TrademarkStatus> = {
  filing: "payment_received",
  office_action: "responding_to_office_action",
  registration: "registration_fee_paid",
};

/**
 * Auto-transition application status when payment is completed
 *
 * This function is called after a payment status is updated to "paid"
 */
export async function autoTransitionOnPaymentComplete(
  client: SupabaseClient,
  applicationId: string,
  paymentStage: PaymentStage,
  changedBy?: string | null
): Promise<{ success: boolean; error?: string; newStatus?: TrademarkStatus }> {
  try {
    // Get current application status
    const { data: application, error: appError } = await client
      .from("trademark_applications")
      .select("id, status, brand_name")
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return { success: false, error: "Application not found" };
    }

    const currentStatus = application.status as TrademarkStatus;
    const targetStatus = PAYMENT_COMPLETION_TRANSITIONS[paymentStage];

    if (!targetStatus) {
      return { success: false, error: `No auto-transition defined for stage: ${paymentStage}` };
    }

    // Update application status
    const now = new Date().toISOString();
    const { error: updateError } = await client
      .from("trademark_applications")
      .update({
        status: targetStatus,
        status_updated_at: now,
        status_detail: getStatusDetailForPaymentCompletion(paymentStage),
      })
      .eq("id", applicationId);

    if (updateError) {
      console.error("Failed to update application status:", updateError);
      return { success: false, error: "Failed to update application status" };
    }

    // Log status change
    await client.from("trademark_status_logs").insert({
      application_id: applicationId,
      from_status: currentStatus,
      to_status: targetStatus,
      note: `${getPaymentStageName(paymentStage)} 입금 완료`,
      changed_by: changedBy || null,
      metadata: {
        trigger: "payment_completed",
        payment_stage: paymentStage,
        automated: true,
      },
    });

    return { success: true, newStatus: targetStatus };
  } catch (error) {
    console.error("Error in autoTransitionOnPaymentComplete:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if application can proceed to next stage based on payment completion
 */
export async function canProceedToNextStage(
  client: SupabaseClient,
  applicationId: string,
  requiredStage: PaymentStage
): Promise<boolean> {
  return await isPaymentStageCompleted(client, applicationId, requiredStage);
}

/**
 * Get all required payments for current application status
 */
export function getRequiredPaymentStages(status: TrademarkStatus): PaymentStage[] {
  // Define which payment stages are required for each status
  const requirements: Partial<Record<TrademarkStatus, PaymentStage[]>> = {
    submitted: ["filing"],
    awaiting_payment: ["filing"],
    payment_received: [],
    awaiting_applicant_info: [],
    applicant_info_completed: [],
    preparing_filing: [],
    filed: [],
    under_examination: [],
    awaiting_office_action: ["office_action"],
    responding_to_office_action: [],
    publication_announced: [],
    registration_decided: ["registration"],
    awaiting_registration_fee: ["registration"],
    registration_fee_paid: [],
    registered: [],
  };

  return requirements[status] || [];
}

/**
 * Get payment stage name in Korean
 */
function getPaymentStageName(stage: PaymentStage): string {
  const names: Record<PaymentStage, string> = {
    filing: "출원 비용",
    office_action: "의견서 작성료",
    registration: "등록 비용",
  };
  return names[stage] || stage;
}

/**
 * Get status detail message for payment completion
 */
function getStatusDetailForPaymentCompletion(stage: PaymentStage): string {
  const messages: Record<PaymentStage, string> = {
    filing: "출원 비용 입금이 확인되었습니다. 출원인 정보 수집을 시작합니다.",
    office_action: "의견서 작성료 입금이 확인되었습니다. 의견서 작성을 시작합니다.",
    registration: "등록료 입금이 확인되었습니다. 특허청에 등록료를 납부하겠습니다.",
  };
  return messages[stage] || "입금이 확인되었습니다.";
}

/**
 * Validate payment before status transition
 *
 * Ensures that required payments are completed before allowing status changes
 */
export async function validatePaymentForStatusTransition(
  client: SupabaseClient,
  applicationId: string,
  targetStatus: TrademarkStatus
): Promise<{ valid: boolean; error?: string; missingPayments?: PaymentStage[] }> {
  const requiredStages = getRequiredPaymentStages(targetStatus);

  if (requiredStages.length === 0) {
    return { valid: true };
  }

  const missingPayments: PaymentStage[] = [];

  for (const stage of requiredStages) {
    const isCompleted = await isPaymentStageCompleted(client, applicationId, stage);
    if (!isCompleted) {
      missingPayments.push(stage);
    }
  }

  if (missingPayments.length > 0) {
    const stageNames = missingPayments.map(getPaymentStageName).join(", ");
    return {
      valid: false,
      error: `다음 결제가 완료되지 않았습니다: ${stageNames}`,
      missingPayments,
    };
  }

  return { valid: true };
}
