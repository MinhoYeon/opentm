import {
  TRADEMARK_STATUS_VALUES,
  type NotificationTemplate,
  type StatusMetadata,
  type StatusNotificationTemplates,
  type TrademarkStatus,
} from "../types/status";

const DEFAULT_BADGE = {
  backgroundClass: "bg-slate-100 text-slate-700",
  dotClass: "bg-slate-500",
};

const DEFAULT_TIMELINE = {
  accentColor: "#cbd5f5",
  iconBackground: "#e2e8f0",
  iconColor: "#334155",
  icon: "document" as const,
};

export const STATUS_METADATA: Record<TrademarkStatus, StatusMetadata> = {
  draft: {
    key: "draft",
    label: "임시 저장",
    helpText: "제출 전 임시 저장 상태입니다.",
    tone: "neutral",
    badge: DEFAULT_BADGE,
    timeline: DEFAULT_TIMELINE,
  },
  awaiting_payment: {
    key: "awaiting_payment",
    label: "입금 대기",
    helpText: "가상계좌 입금이 확인되면 다음 단계로 진행됩니다.",
    tone: "warning",
    badge: {
      backgroundClass: "bg-amber-100 text-amber-700",
      dotClass: "bg-amber-500",
    },
    timeline: {
      accentColor: "#fbbf24",
      iconBackground: "#fef3c7",
      iconColor: "#b45309",
      icon: "payment",
    },
  },
  payment_received: {
    key: "payment_received",
    label: "결제 완료",
    helpText: "결제가 완료되었습니다. 담당 변리사가 서류를 준비하고 있어요.",
    tone: "success",
    badge: {
      backgroundClass: "bg-emerald-100 text-emerald-700",
      dotClass: "bg-emerald-500",
    },
    timeline: {
      accentColor: "#34d399",
      iconBackground: "#d1fae5",
      iconColor: "#047857",
      icon: "check",
    },
  },
  awaiting_documents: {
    key: "awaiting_documents",
    label: "자료 보완 요청",
    helpText: "출원에 필요한 자료를 제출해 주세요. 담당자가 업로드 방법을 안내드립니다.",
    tone: "info",
    badge: {
      backgroundClass: "bg-sky-100 text-sky-700",
      dotClass: "bg-sky-500",
    },
    timeline: {
      accentColor: "#38bdf8",
      iconBackground: "#e0f2fe",
      iconColor: "#0284c7",
      icon: "document",
    },
  },
  preparing_filing: {
    key: "preparing_filing",
    label: "출원 준비",
    helpText: "제출 서류를 검토하고 있습니다.",
    tone: "info",
    badge: {
      backgroundClass: "bg-indigo-100 text-indigo-700",
      dotClass: "bg-indigo-500",
    },
    timeline: {
      accentColor: "#818cf8",
      iconBackground: "#eef2ff",
      iconColor: "#4338ca",
      icon: "clipboard",
    },
  },
  awaiting_client_signature: {
    key: "awaiting_client_signature",
    label: "전자서명 대기",
    helpText: "서류 확인 후 전자서명을 완료해 주세요.",
    tone: "warning",
    badge: {
      backgroundClass: "bg-amber-100 text-amber-700",
      dotClass: "bg-amber-500",
    },
    timeline: {
      accentColor: "#f59e0b",
      iconBackground: "#fef3c7",
      iconColor: "#b45309",
      icon: "contract",
    },
  },
  filed: {
    key: "filed",
    label: "출원 완료",
    helpText: "특허청에 출원이 접수되었습니다.",
    tone: "info",
    badge: {
      backgroundClass: "bg-blue-100 text-blue-700",
      dotClass: "bg-blue-500",
    },
    timeline: {
      accentColor: "#60a5fa",
      iconBackground: "#dbeafe",
      iconColor: "#1d4ed8",
      icon: "plane",
    },
  },
  office_action: {
    key: "office_action",
    label: "심사 진행중",
    helpText: "특허청의 검토가 진행 중입니다.",
    tone: "warning",
    badge: {
      backgroundClass: "bg-amber-100 text-amber-700",
      dotClass: "bg-amber-500",
    },
    timeline: {
      accentColor: "#fbbf24",
      iconBackground: "#fef3c7",
      iconColor: "#b45309",
      icon: "search",
    },
  },
  awaiting_client_response: {
    key: "awaiting_client_response",
    label: "의견서 준비",
    helpText: "특허청 대응을 위해 의견서/자료 보완이 필요합니다.",
    tone: "warning",
    badge: {
      backgroundClass: "bg-orange-100 text-orange-700",
      dotClass: "bg-orange-500",
    },
    timeline: {
      accentColor: "#fb923c",
      iconBackground: "#ffedd5",
      iconColor: "#c2410c",
      icon: "alert",
    },
  },
  awaiting_registration_fee: {
    key: "awaiting_registration_fee",
    label: "등록료 안내",
    helpText: "등록 결정을 위해 잔여 등록료를 납부해 주세요.",
    tone: "warning",
    badge: {
      backgroundClass: "bg-yellow-100 text-yellow-700",
      dotClass: "bg-yellow-500",
    },
    timeline: {
      accentColor: "#facc15",
      iconBackground: "#fef9c3",
      iconColor: "#ca8a04",
      icon: "payment",
    },
  },
  completed: {
    key: "completed",
    label: "등록 완료",
    helpText: "상표 등록이 완료되었습니다.",
    tone: "success",
    badge: {
      backgroundClass: "bg-emerald-100 text-emerald-700",
      dotClass: "bg-emerald-500",
    },
    timeline: {
      accentColor: "#34d399",
      iconBackground: "#d1fae5",
      iconColor: "#047857",
      icon: "shield",
    },
  },
  rejected: {
    key: "rejected",
    label: "거절",
    helpText: "심사 결과 거절되었습니다. 대응 가능 여부를 담당자와 상의해 주세요.",
    tone: "danger",
    badge: {
      backgroundClass: "bg-rose-100 text-rose-700",
      dotClass: "bg-rose-500",
    },
    timeline: {
      accentColor: "#f87171",
      iconBackground: "#fee2e2",
      iconColor: "#b91c1c",
      icon: "alert",
    },
  },
  cancelled: {
    key: "cancelled",
    label: "취소됨",
    helpText: "요청이 취소되었습니다.",
    tone: "neutral",
    badge: {
      backgroundClass: "bg-slate-100 text-slate-600",
      dotClass: "bg-slate-400",
    },
    timeline: {
      accentColor: "#cbd5f5",
      iconBackground: "#f1f5f9",
      iconColor: "#475569",
      icon: "ban",
    },
  },
};

const DEFAULT_NOTIFICATION: NotificationTemplate = {
  channels: [],
};

export const STATUS_NOTIFICATION_TEMPLATES: StatusNotificationTemplates = {
  draft: {
    channels: ["email"],
    emailSubject: "임시 저장된 상표 출원 초안",
    emailBody:
      "{{brandName}} 출원 초안이 저장되었습니다. 언제든지 마이페이지에서 이어서 진행하실 수 있습니다.",
  },
  awaiting_payment: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 입금 대기 안내 - {{brandName}}",
    emailBody:
      "{{brandName}} 출원 진행을 위해 안내드린 계좌로 입금해 주세요. 입금 확인 즉시 서류 검토를 시작합니다.",
    smsBody: "[OpenTM] {{brandName}} 출원 입금 확인 필요. 마이페이지에서 가상계좌 정보를 확인하세요.",
  },
  payment_received: {
    channels: ["email"],
    emailSubject: "[OpenTM] 결제 완료 - {{brandName}}",
    emailBody:
      "입금이 확인되었습니다. 담당 변리사가 서류 검토를 시작했습니다. 진행 상황은 마이페이지에서 확인하실 수 있습니다.",
  },
  awaiting_documents: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 자료 제출 요청 - {{brandName}}",
    emailBody:
      "출원에 필요한 자료가 필요합니다. 안내드린 체크리스트를 확인하시고 자료를 업로드해 주세요.",
    smsBody: "[OpenTM] {{brandName}} 출원 자료 보완 요청이 도착했습니다. 마이페이지에서 자세히 확인해 주세요.",
    escalateToOps: true,
  },
  preparing_filing: {
    channels: ["email"],
    emailSubject: "[OpenTM] 출원 서류 검토중 - {{brandName}}",
    emailBody:
      "담당 변리사가 제출 서류를 검토하고 있습니다. 추가 요청이 있을 경우 별도 안내드립니다.",
  },
  awaiting_client_signature: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 전자서명 요청 - {{brandName}}",
    emailBody:
      "출원 서류 검토가 완료되었습니다. 마이페이지에서 전자서명을 진행해 주세요.",
    smsBody: "[OpenTM] {{brandName}} 전자서명이 필요합니다. 서명을 완료하셔야 출원이 접수됩니다.",
  },
  filed: {
    channels: ["email"],
    emailSubject: "[OpenTM] 출원 접수 완료 - {{brandName}}",
    emailBody:
      "특허청에 출원이 접수되었습니다. 접수번호 및 예상 심사 일정을 마이페이지에서 확인하실 수 있습니다.",
  },
  office_action: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 심사 진행 알림 - {{brandName}}",
    emailBody:
      "특허청 심사가 진행 중입니다. 심사 의견 수신 시 신속하게 안내드리겠습니다.",
    smsBody: "[OpenTM] {{brandName}} 심사가 진행 중입니다. 의견 통보 시 즉시 안내드릴 예정입니다.",
  },
  awaiting_client_response: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 의견서/자료 제출 요청 - {{brandName}}",
    emailBody:
      "특허청 대응을 위해 의견서 또는 추가 자료가 필요합니다. 기한 내 제출을 위해 담당자와 상담해 주세요.",
    smsBody: "[OpenTM] {{brandName}} 의견서 제출이 필요합니다. 마이페이지 공지와 담당자 안내를 확인해 주세요.",
    escalateToOps: true,
  },
  awaiting_registration_fee: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 등록료 납부 안내 - {{brandName}}",
    emailBody:
      "등록 결정을 위해 잔여 등록료 납부가 필요합니다. 납부 기한을 확인해 주세요.",
    smsBody: "[OpenTM] {{brandName}} 등록료 납부 안내. 마이페이지에서 납부 정보를 확인해 주세요.",
  },
  completed: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 등록 완료 축하드립니다 - {{brandName}}",
    emailBody:
      "상표 등록이 완료되었습니다. 등록증 수령 안내와 유지 관리 일정을 확인해 주세요.",
    smsBody: "[OpenTM] {{brandName}} 상표 등록이 완료되었습니다. 축하드립니다!",
  },
  rejected: {
    channels: ["email", "sms"],
    emailSubject: "[OpenTM] 심사 거절 안내 - {{brandName}}",
    emailBody:
      "심사 결과 거절되었습니다. 대응 가능한 방안을 함께 검토해 드릴 예정입니다.",
    smsBody: "[OpenTM] {{brandName}} 심사 거절 결과가 도착했습니다. 담당자와 대응 여부를 상의해 주세요.",
    escalateToOps: true,
  },
  cancelled: {
    channels: ["email"],
    emailSubject: "[OpenTM] 출원 취소 안내 - {{brandName}}",
    emailBody:
      "요청하신 상표 출원이 취소되었습니다. 필요 시 새 요청을 생성해 주세요.",
  },
};

export function getStatusMetadata(status: string | null | undefined): StatusMetadata {
  if (!status) {
    return {
      key: "draft",
      label: "진행 중",
      helpText: "진행 상황을 확인하고 있습니다.",
      tone: "neutral",
      badge: DEFAULT_BADGE,
      timeline: DEFAULT_TIMELINE,
    };
  }

  const normalized = status.trim().toLowerCase();
  if ((TRADEMARK_STATUS_VALUES as readonly string[]).includes(normalized)) {
    return STATUS_METADATA[normalized as TrademarkStatus];
  }

  return {
    key: "draft",
    label: "진행 중",
    helpText: "진행 상황을 확인하고 있습니다.",
    tone: "neutral",
    badge: DEFAULT_BADGE,
    timeline: DEFAULT_TIMELINE,
  };
}

export function getNotificationTemplate(status: string | null | undefined): NotificationTemplate {
  if (!status) {
    return DEFAULT_NOTIFICATION;
  }

  const normalized = status.trim().toLowerCase();
  if ((TRADEMARK_STATUS_VALUES as readonly string[]).includes(normalized)) {
    return STATUS_NOTIFICATION_TEMPLATES[normalized as TrademarkStatus];
  }

  return DEFAULT_NOTIFICATION;
}

export const NOTIFICATION_ESCALATION_STATUSES: TrademarkStatus[] = TRADEMARK_STATUS_VALUES.filter((status) =>
  STATUS_NOTIFICATION_TEMPLATES[status as TrademarkStatus]?.escalateToOps
) as TrademarkStatus[];
