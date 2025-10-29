/**
 * Payment utility functions
 *
 * Helper functions for working with trademark payments
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  TrademarkPayment,
  PaymentStage,
  PaymentStatus,
  PaymentStageSummary,
  ApplicationPaymentSummary,
} from "@/types/trademark";

/**
 * Normalize payment data from database
 */
export function normalizePayment(row: Record<string, unknown>): TrademarkPayment {
  return {
    id: String(row.id || ""),
    applicationId: String(row.application_id || ""),
    paymentStage: String(row.payment_stage || "") as PaymentStage,
    paymentStatus: String(row.payment_status || "not_requested") as PaymentStatus,
    amount: typeof row.amount === "number" ? row.amount : null,
    paidAmount: typeof row.paid_amount === "number" ? row.paid_amount : 0,
    currency: String(row.currency || "KRW"),
    quoteSentAt: typeof row.quote_sent_at === "string" ? row.quote_sent_at : null,
    dueAt: typeof row.due_at === "string" ? row.due_at : null,
    paidAt: typeof row.paid_at === "string" ? row.paid_at : null,
    remitterName: typeof row.remitter_name === "string" ? row.remitter_name : null,
    paymentMethod: typeof row.payment_method === "string" ? row.payment_method : null,
    transactionReference: typeof row.transaction_reference === "string" ? row.transaction_reference : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    metadata: (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>,
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

/**
 * Create payment stage summary from payment record
 */
export function createPaymentStageSummary(payment: TrademarkPayment): PaymentStageSummary {
  const now = new Date();
  const dueDate = payment.dueAt ? new Date(payment.dueAt) : null;
  const isOverdue = dueDate ? now > dueDate && payment.paymentStatus !== "paid" : false;

  return {
    stage: payment.paymentStage,
    status: payment.paymentStatus,
    amount: payment.amount,
    paidAmount: payment.paidAmount,
    dueAt: payment.dueAt,
    isOverdue,
    isPaid: payment.paymentStatus === "paid",
  };
}

/**
 * Create application payment summary from multiple payments
 */
export function createApplicationPaymentSummary(
  payments: TrademarkPayment[]
): ApplicationPaymentSummary {
  const summary: ApplicationPaymentSummary = {
    filing: null,
    officeAction: null,
    registration: null,
    totalAmount: 0,
    totalPaid: 0,
    hasOverdue: false,
    allPaid: true,
  };

  for (const payment of payments) {
    const stageSummary = createPaymentStageSummary(payment);

    // Assign to appropriate stage
    switch (payment.paymentStage) {
      case "filing":
        summary.filing = stageSummary;
        break;
      case "office_action":
        summary.officeAction = stageSummary;
        break;
      case "registration":
        summary.registration = stageSummary;
        break;
    }

    // Update totals
    summary.totalAmount += payment.amount || 0;
    summary.totalPaid += payment.paidAmount || 0;

    // Check for issues
    if (stageSummary.isOverdue) {
      summary.hasOverdue = true;
    }

    if (!stageSummary.isPaid && payment.paymentStatus !== "refunded") {
      summary.allPaid = false;
    }
  }

  return summary;
}

/**
 * Fetch all payments for an application
 */
export async function fetchApplicationPayments(
  client: SupabaseClient,
  applicationId: string
): Promise<TrademarkPayment[]> {
  const { data, error } = await client
    .from("trademark_payments")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch payments: ${error.message}`);
  }

  return (data || []).map(normalizePayment);
}

/**
 * Get payment by stage for an application
 */
export async function getPaymentByStage(
  client: SupabaseClient,
  applicationId: string,
  stage: PaymentStage
): Promise<TrademarkPayment | null> {
  const { data, error } = await client
    .from("trademark_payments")
    .select("*")
    .eq("application_id", applicationId)
    .eq("payment_stage", stage)
    .single();

  if (error || !data) {
    return null;
  }

  return normalizePayment(data);
}

/**
 * Check if a payment stage is completed
 */
export async function isPaymentStageCompleted(
  client: SupabaseClient,
  applicationId: string,
  stage: PaymentStage
): Promise<boolean> {
  const payment = await getPaymentByStage(client, applicationId, stage);
  return payment?.paymentStatus === "paid";
}

/**
 * Get payment progress percentage
 */
export function getPaymentProgress(payment: TrademarkPayment): number {
  if (!payment.amount || payment.amount === 0) {
    return 0;
  }

  const progress = (payment.paidAmount / payment.amount) * 100;
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0 and 100
}

/**
 * Calculate remaining amount to be paid
 */
export function getRemainingAmount(payment: TrademarkPayment): number {
  if (!payment.amount) {
    return 0;
  }

  return Math.max(payment.amount - payment.paidAmount, 0);
}

/**
 * Check if payment is overdue
 */
export function isPaymentOverdue(payment: TrademarkPayment): boolean {
  if (!payment.dueAt || payment.paymentStatus === "paid") {
    return false;
  }

  const now = new Date();
  const dueDate = new Date(payment.dueAt);
  return now > dueDate;
}

/**
 * Format amount as currency string
 */
export function formatPaymentAmount(amount: number, currency: string = "KRW"): string {
  if (currency === "KRW") {
    return `${amount.toLocaleString()}원`;
  }

  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
  }).format(amount);
}
