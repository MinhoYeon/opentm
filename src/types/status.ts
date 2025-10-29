export const TRADEMARK_STATUS_VALUES = [
  "draft",
  "submitted",
  "awaiting_payment",
  "payment_received",
  "awaiting_applicant_info",
  "applicant_info_completed",
  "awaiting_documents",
  "preparing_filing",
  "awaiting_client_signature",
  "filed",
  "under_examination",
  "office_action",
  "awaiting_office_action",
  "responding_to_office_action",
  "awaiting_client_response",
  "publication_announced",
  "registration_decided",
  "awaiting_registration_fee",
  "registration_fee_paid",
  "completed",
  "registered",
  "rejected",
  "cancelled",
  "withdrawn",
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
