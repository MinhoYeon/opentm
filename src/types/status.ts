export const TRADEMARK_STATUS_VALUES = [
  "submitted",                    // 신청 접수
  "awaiting_applicant_info",      // 출원인 정보 대기
  "awaiting_documents",           // 자료 보완
  "preparing_filing",             // 출원 준비
  "awaiting_client_signature",    // 서명 대기
  "filed",                        // 출원 완료
  "awaiting_acceleration",        // 우선심사신청 대기
  "preparing_acceleration",       // 우선심사신청 준비
  "under_examination",            // 심사 중
  "awaiting_office_action",       // 의견제출통지서 대기
  "responding_to_office_action",  // 의견/보정 진행
  "publication_announced",        // 출원공고
  "registration_decided",         // 등록결정
  "awaiting_registration_fee",    // 등록료 납부
  "registration_fee_paid",        // 등록료 완료
  "registered",                   // 등록 완료
  "rejected",                     // 거절
  "cancelled",                    // 취소
  "withdrawn",                    // 취하/포기
] as const;

export type TrademarkStatus = (typeof TRADEMARK_STATUS_VALUES)[number];

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

export type StatusBadgeMetadata = {
  backgroundClass: string;
  dotClass: string;
};

export type StatusTimelineMetadata = {
  accentColor: string;
  iconBackground: string;
  iconColor: string;
  icon:
    | "document"
    | "payment"
    | "check"
    | "clipboard"
    | "plane"
    | "search"
    | "shield"
    | "alert"
    | "ban"
    | "contract"
    | "handshake";
};

export type StatusMetadata = {
  key: TrademarkStatus;
  label: string;
  shortLabel?: string;
  helpText: string;
  tone: StatusTone;
  badge: StatusBadgeMetadata;
  timeline: StatusTimelineMetadata;
};

export type NotificationChannel = "email" | "sms";

export type NotificationTemplate = {
  channels: NotificationChannel[];
  emailSubject?: string;
  emailBody?: string;
  smsBody?: string;
  escalateToOps?: boolean;
};

export type StatusNotificationTemplates = Record<TrademarkStatus, NotificationTemplate>;
