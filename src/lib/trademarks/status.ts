import { TRADEMARK_STATUS_VALUES } from "../../types/status";
import type { TrademarkStatus } from "../../types/status";

export const TRADEMARK_STATUSES = TRADEMARK_STATUS_VALUES;

type TransitionMap = Record<TrademarkStatus, TrademarkStatus[]>;

export const TRADEMARK_STATUS_TRANSITIONS: TransitionMap = {
  submitted: ["awaiting_applicant_info", "awaiting_documents", "cancelled"],
  awaiting_applicant_info: ["awaiting_documents", "preparing_filing", "cancelled"],
  awaiting_documents: ["preparing_filing", "awaiting_client_signature", "cancelled"],
  preparing_filing: ["awaiting_client_signature", "filed", "cancelled"],
  awaiting_client_signature: ["filed", "cancelled"],
  filed: ["awaiting_acceleration", "under_examination", "rejected", "withdrawn"],
  awaiting_acceleration: ["preparing_acceleration", "under_examination", "withdrawn"],
  preparing_acceleration: ["under_examination", "withdrawn"],
  under_examination: ["awaiting_office_action", "publication_announced", "registration_decided", "rejected"],
  awaiting_office_action: ["responding_to_office_action", "withdrawn"],
  responding_to_office_action: ["under_examination", "publication_announced", "rejected", "withdrawn"],
  publication_announced: ["registration_decided", "rejected"],
  registration_decided: ["awaiting_registration_fee", "withdrawn"],
  awaiting_registration_fee: ["registration_fee_paid", "withdrawn"],
  registration_fee_paid: ["registered", "withdrawn"],
  registered: [],
  rejected: ["withdrawn"],
  cancelled: [],
  withdrawn: [],
};

export const TERMINAL_STATUSES: readonly TrademarkStatus[] = [
  "registered",
  "rejected",
  "cancelled",
  "withdrawn",
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
  // 초기 상태는 항상 submitted로 시작
  return "submitted";
}

export function shouldSetFiledAt(status: TrademarkStatus): boolean {
  return status === "filed";
}
