export const TRADEMARK_STATUSES = [
  "draft",
  "awaiting_payment",
  "payment_received",
  "preparing_filing",
  "filed",
  "office_action",
  "rejected",
  "completed",
  "cancelled",
] as const;

export type TrademarkStatus = (typeof TRADEMARK_STATUSES)[number];

type TransitionMap = Record<TrademarkStatus, TrademarkStatus[]>;

export const TRADEMARK_STATUS_TRANSITIONS: TransitionMap = {
  draft: ["awaiting_payment", "preparing_filing", "cancelled"],
  awaiting_payment: ["payment_received", "preparing_filing", "cancelled"],
  payment_received: ["preparing_filing", "cancelled"],
  preparing_filing: ["filed", "cancelled"],
  filed: ["office_action", "completed", "rejected"],
  office_action: ["preparing_filing", "completed", "rejected", "cancelled"],
  rejected: ["preparing_filing", "cancelled"],
  completed: [],
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
    return "preparing_filing";
  }

  if (typeof options.paymentAmount === "number" && options.paymentAmount > 0) {
    return "awaiting_payment";
  }

  return "preparing_filing";
}

export function shouldSetPaymentReceivedAt(status: TrademarkStatus): boolean {
  return status === "payment_received";
}

export function shouldSetFiledAt(status: TrademarkStatus): boolean {
  return status === "filed";
}
