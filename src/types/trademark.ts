/**
 * Trademark payment types
 *
 * This module defines types for the multi-stage payment system used in trademark applications.
 * Each trademark application can have up to 3 payment stages: filing, office_action, and registration.
 */

import type { TrademarkStatus } from "./status";

// ============================================================================
// Payment Status Types
// ============================================================================

/**
 * Payment status enum
 * Tracks the current state of a payment request
 */
export const PAYMENT_STATUS_VALUES = [
  "not_requested",     // 견적서 미발송
  "quote_sent",        // 견적서 발송됨
  "unpaid",            // 미납 (결제 기한 내)
  "partial",           // 일부 입금
  "paid",              // 전액 입금 완료
  "overdue",           // 연체 (결제 기한 초과)
  "refund_requested",  // 환불 요청
  "refunded",          // 환불 완료
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUS_VALUES)[number];

/**
 * Payment stage enum
 * Identifies which phase of the trademark process the payment is for
 */
export const PAYMENT_STAGE_VALUES = [
  "filing",        // 출원 비용 (출원 대행료 + 특허청 출원료)
  "office_action", // 중간 비용 (의견서/보정서 작성료) - 선택적
  "registration",  // 등록 비용 (등록 대행료 + 특허청 등록료)
] as const;

export type PaymentStage = (typeof PAYMENT_STAGE_VALUES)[number];

// ============================================================================
// Payment Record Type
// ============================================================================

/**
 * Trademark payment record
 * Represents a single payment stage for a trademark application
 */
export type TrademarkPayment = {
  id: string;
  applicationId: string;

  // Payment identification
  paymentStage: PaymentStage;
  paymentStatus: PaymentStatus;

  // Amount information
  amount: number | null;          // Total amount to be paid
  paidAmount: number;             // Amount already paid (for partial payments)
  currency: string;               // Currency code (default: KRW)

  // Date tracking
  quoteSentAt: string | null;     // When the quote was sent
  dueAt: string | null;           // Payment due date
  paidAt: string | null;          // When payment was received

  // Payer information
  remitterName: string | null;    // Name of the person who made the payment
  paymentMethod: string | null;   // Payment method (e.g., bank_transfer, credit_card)
  transactionReference: string | null; // Bank transaction reference or receipt number

  // Additional information
  notes: string | null;           // Internal notes
  metadata: Record<string, unknown>; // Additional metadata (JSON)

  // Timestamps
  createdAt: string;
  updatedAt: string;
};

/**
 * Create payment input
 * Used when creating a new payment record
 */
export type CreateTrademarkPaymentInput = {
  applicationId: string;
  paymentStage: PaymentStage;
  amount?: number | null;
  currency?: string;
  dueAt?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Update payment input
 * Used when updating an existing payment record
 */
export type UpdateTrademarkPaymentInput = {
  paymentStatus?: PaymentStatus;
  amount?: number | null;
  paidAmount?: number;
  quoteSentAt?: string | null;
  dueAt?: string | null;
  paidAt?: string | null;
  remitterName?: string | null;
  paymentMethod?: string | null;
  transactionReference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
};

// ============================================================================
// Payment Summary Types
// ============================================================================

/**
 * Payment summary for a single stage
 * Provides a quick overview of payment status
 */
export type PaymentStageSummary = {
  stage: PaymentStage;
  status: PaymentStatus;
  amount: number | null;
  paidAmount: number;
  dueAt: string | null;
  isOverdue: boolean;
  isPaid: boolean;
};

/**
 * Complete payment summary for an application
 * Aggregates all payment stages
 */
export type ApplicationPaymentSummary = {
  filing: PaymentStageSummary | null;
  officeAction: PaymentStageSummary | null;
  registration: PaymentStageSummary | null;
  totalAmount: number;
  totalPaid: number;
  hasOverdue: boolean;
  allPaid: boolean;
};

// ============================================================================
// Case Status Aliases
// ============================================================================

/**
 * Re-export TrademarkStatus as CaseStatus for clarity
 * "Case status" emphasizes the overall workflow state
 */
export type CaseStatus = TrademarkStatus;

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard for PaymentStatus
 */
export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && (PAYMENT_STATUS_VALUES as readonly string[]).includes(value);
}

/**
 * Type guard for PaymentStage
 */
export function isPaymentStage(value: unknown): value is PaymentStage {
  return typeof value === "string" && (PAYMENT_STAGE_VALUES as readonly string[]).includes(value);
}

// ============================================================================
// Payment Status Helpers
// ============================================================================

/**
 * Check if a payment status indicates the payment is complete
 */
export function isPaymentComplete(status: PaymentStatus): boolean {
  return status === "paid";
}

/**
 * Check if a payment status indicates the payment is pending
 */
export function isPaymentPending(status: PaymentStatus): boolean {
  return ["not_requested", "quote_sent", "unpaid", "partial"].includes(status);
}

/**
 * Check if a payment status indicates there's an issue
 */
export function hasPaymentIssue(status: PaymentStatus): boolean {
  return ["overdue", "refund_requested"].includes(status);
}

/**
 * Get user-friendly label for payment status
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    not_requested: "미요청",
    quote_sent: "견적 발송",
    unpaid: "미납",
    partial: "일부 입금",
    paid: "입금 완료",
    overdue: "연체",
    refund_requested: "환불 요청",
    refunded: "환불 완료",
  };
  return labels[status] || status;
}

/**
 * Get user-friendly label for payment stage
 */
export function getPaymentStageLabel(stage: PaymentStage): string {
  const labels: Record<PaymentStage, string> = {
    filing: "출원 비용",
    office_action: "의견서 작성료",
    registration: "등록 비용",
  };
  return labels[stage] || stage;
}

// ============================================================================
// Payment Validation
// ============================================================================

/**
 * Validate payment amounts
 */
export function validatePaymentAmounts(
  amount: number | null,
  paidAmount: number
): { valid: boolean; error?: string } {
  if (paidAmount < 0) {
    return { valid: false, error: "입금 금액은 0 이상이어야 합니다." };
  }

  if (amount !== null && amount < 0) {
    return { valid: false, error: "청구 금액은 0 이상이어야 합니다." };
  }

  if (amount !== null && paidAmount > amount) {
    return { valid: false, error: "입금 금액이 청구 금액을 초과할 수 없습니다." };
  }

  return { valid: true };
}
