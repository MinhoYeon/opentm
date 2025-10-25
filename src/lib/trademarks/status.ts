import { TRADEMARK_STATUS_VALUES } from "../../types/status";
import type { TrademarkStatus } from "../../types/status";

export const TRADEMARK_STATUSES = TRADEMARK_STATUS_VALUES;

type TransitionMap = Record<TrademarkStatus, TrademarkStatus[]>;

export const TRADEMARK_STATUS_TRANSITIONS: TransitionMap = {
  draft: ["awaiting_payment", "awaiting_documents", "preparing_filing", "cancelled"],
  awaiting_payment: ["payment_received", "awaiting_documents", "preparing_filing", "cancelled"],
  payment_received: ["awaiting_documents", "preparing_filing", "cancelled"],
  awaiting_documents: ["preparing_filing", "awaiting_client_signature", "cancelled"],
  preparing_filing: ["awaiting_client_signature", "filed", "cancelled"],
  awaiting_client_signature: ["filed", "cancelled"],
  filed: ["office_action", "awaiting_registration_fee", "completed", "rejected"],
  office_action: ["awaiting_client_response", "preparing_filing", "completed", "rejected", "cancelled"],
  awaiting_client_response: ["preparing_filing", "office_action", "cancelled"],
  awaiting_registration_fee: ["completed", "cancelled"],
  completed: [],
  rejected: ["awaiting_documents", "preparing_filing", "cancelled"],
  cancelled: [],
};

export const TERMINAL_STATUSES: readonly TrademarkStatus[] = [
  "completed",
  "cancelled",
];

export function isTrademarkStatus(value: unknown): value is TrademarkStatus {
  return typeof value === "string" && (TRADEMARK_STATUSES as readonly string[]).includes(value);
}

export function canTransitionStatus(
  current: TrademarkStatus,
  next: TrademarkStatus
): boolean {
  if (current === next) {
    return true;
  }
  const allowed = TRADEMARK_STATUS_TRANSITIONS[current];
  return allowed ? allowed.includes(next) : false;
}

export function resolveInitialStatus(options: {
  paymentAmount?: number | null;
  skipPaymentGate?: boolean;
}): TrademarkStatus {
  if (options.skipPaymentGate) {
    return "awaiting_documents";
  }

  if (typeof options.paymentAmount === "number" && options.paymentAmount > 0) {
    return "awaiting_payment";
  }

  return "awaiting_documents";
}

export function shouldSetPaymentReceivedAt(status: TrademarkStatus): boolean {
  return status === "payment_received";
}

export function shouldSetFiledAt(status: TrademarkStatus): boolean {
  return status === "filed";
}
