/**
 * 이메일 알림 서비스
 */

import type {
  EmailRecipient,
  EmailSendResult,
  QuoteEmailData,
  PaymentConfirmedEmailData,
  PaymentReminderEmailData,
} from "@/types/email";
import {
  generateQuoteEmail,
  generatePaymentConfirmedEmail,
  generatePaymentReminderEmail,
} from "./templates";
import { sendEmail } from "./sender";

/**
 * 견적서 발송 알림 이메일 전송
 */
export async function sendQuoteNotification(data: QuoteEmailData): Promise<EmailSendResult> {
  const recipient: EmailRecipient = {
    email: data.applicantEmail,
    name: data.applicantName,
  };

  const { subject, html } = generateQuoteEmail(data);

  return sendEmail({
    from: {
      email: process.env.SMTP_FROM_EMAIL || "noreply@example.com",
      name: "상표출원시스템",
    },
    to: recipient,
    subject,
    html,
  });
}

/**
 * 입금 확인 알림 이메일 전송
 */
export async function sendPaymentConfirmedNotification(
  data: PaymentConfirmedEmailData
): Promise<EmailSendResult> {
  const recipient: EmailRecipient = {
    email: data.applicantEmail,
    name: data.applicantName,
  };

  const { subject, html } = generatePaymentConfirmedEmail(data);

  return sendEmail({
    from: {
      email: process.env.SMTP_FROM_EMAIL || "noreply@example.com",
      name: "상표출원시스템",
    },
    to: recipient,
    subject,
    html,
  });
}

/**
 * 결제 기한 임박/초과 알림 이메일 전송
 */
export async function sendPaymentReminderNotification(
  data: PaymentReminderEmailData
): Promise<EmailSendResult> {
  const recipient: EmailRecipient = {
    email: data.applicantEmail,
    name: data.applicantName,
  };

  const { subject, html } = generatePaymentReminderEmail(data);

  return sendEmail({
    from: {
      email: process.env.SMTP_FROM_EMAIL || "noreply@example.com",
      name: "상표출원시스템",
    },
    to: recipient,
    subject,
    html,
  });
}
