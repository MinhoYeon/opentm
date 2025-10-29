/**
 * 이메일 알림 타입 정의
 */

export type EmailNotificationType =
  | "quote_sent" // 견적서 발송
  | "payment_confirmed" // 입금 확인
  | "payment_reminder" // 결제 기한 임박
  | "payment_overdue"; // 결제 기한 초과

export type EmailRecipient = {
  email: string;
  name?: string | null;
};

export type QuoteEmailData = {
  applicantName: string;
  applicantEmail: string;
  brandName: string;
  paymentStage: "filing" | "office_action" | "registration";
  paymentStageLabel: string;
  amount: number;
  currency: string;
  dueDate: string;
  quoteSentAt: string;
  managementNumber?: string | null;
};

export type PaymentConfirmedEmailData = {
  applicantName: string;
  applicantEmail: string;
  brandName: string;
  paymentStage: "filing" | "office_action" | "registration";
  paymentStageLabel: string;
  paidAmount: number;
  currency: string;
  paidAt: string;
  remitterName?: string | null;
  managementNumber?: string | null;
};

export type PaymentReminderEmailData = {
  applicantName: string;
  applicantEmail: string;
  brandName: string;
  paymentStage: "filing" | "office_action" | "registration";
  paymentStageLabel: string;
  amount: number;
  unpaidAmount: number;
  currency: string;
  dueDate: string;
  daysUntilDue: number;
  managementNumber?: string | null;
};

export type EmailNotificationData =
  | QuoteEmailData
  | PaymentConfirmedEmailData
  | PaymentReminderEmailData;

export type EmailNotificationRequest = {
  type: EmailNotificationType;
  recipient: EmailRecipient;
  data: EmailNotificationData;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
};

export type EmailSendResult = {
  success: boolean;
  messageId?: string;
  error?: string;
};
