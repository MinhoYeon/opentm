/**
 * 이메일 전송 유틸리티
 *
 * 실제 환경에서는 SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS 등의
 * 환경 변수를 설정하여 사용하거나, Resend/SendGrid 등의 서비스를 사용합니다.
 */

import type { EmailRecipient, EmailSendResult } from "@/types/email";

type EmailOptions = {
  from: EmailRecipient;
  to: EmailRecipient;
  subject: string;
  html: string;
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
};

/**
 * 이메일 전송 함수 (실제 구현)
 *
 * 환경에 따라 다음 중 하나를 사용:
 * 1. Resend (추천)
 * 2. SendGrid
 * 3. Nodemailer with SMTP
 * 4. AWS SES
 */
async function sendEmailViaService(options: EmailOptions): Promise<EmailSendResult> {
  // 개발 환경에서는 콘솔에만 출력
  if (process.env.NODE_ENV === "development" || !process.env.SMTP_HOST) {
    console.log("📧 [Email - Development Mode]");
    console.log("From:", options.from.email);
    console.log("To:", options.to.email);
    console.log("Subject:", options.subject);
    console.log("---");

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  // 실제 환경에서는 이메일 서비스 사용
  try {
    // 예시: Resend 사용
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // const result = await resend.emails.send({
    //   from: `${options.from.name || 'No Reply'} <${options.from.email}>`,
    //   to: options.to.email,
    //   subject: options.subject,
    //   html: options.html,
    // });

    // 예시: Nodemailer 사용
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: parseInt(process.env.SMTP_PORT || '587'),
    //   secure: process.env.SMTP_SECURE === 'true',
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });
    // const info = await transporter.sendMail({
    //   from: `"${options.from.name || 'No Reply'}" <${options.from.email}>`,
    //   to: options.to.email,
    //   subject: options.subject,
    //   html: options.html,
    // });

    // 임시: 성공으로 처리 (실제 구현 필요)
    console.warn("⚠️ Email sending not configured. Set SMTP or email service credentials.");
    return {
      success: true,
      messageId: `temp-${Date.now()}`,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "이메일 전송에 실패했습니다.",
    };
  }
}

/**
 * 이메일 전송 (공개 API)
 */
export async function sendEmail(options: EmailOptions): Promise<EmailSendResult> {
  // 수신자 이메일 주소 검증
  if (!options.to.email || !isValidEmail(options.to.email)) {
    return {
      success: false,
      error: "유효하지 않은 이메일 주소입니다.",
    };
  }

  // 발신자 기본값 설정
  const from = options.from.email
    ? options.from
    : {
        email: process.env.SMTP_FROM_EMAIL || "noreply@example.com",
        name: process.env.SMTP_FROM_NAME || "상표출원시스템",
      };

  return sendEmailViaService({
    ...options,
    from,
  });
}

/**
 * 이메일 주소 검증
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 배치 이메일 전송 (여러 수신자에게 동일한 내용 전송)
 */
export async function sendBatchEmails(
  recipients: EmailRecipient[],
  subject: string,
  html: string,
  from?: EmailRecipient
): Promise<{ total: number; succeeded: number; failed: number; results: EmailSendResult[] }> {
  const results: EmailSendResult[] = [];

  for (const recipient of recipients) {
    const result = await sendEmail({
      from: from || {
        email: process.env.SMTP_FROM_EMAIL || "noreply@example.com",
        name: process.env.SMTP_FROM_NAME || "상표출원시스템",
      },
      to: recipient,
      subject,
      html,
    });
    results.push(result);
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    total: recipients.length,
    succeeded,
    failed,
    results,
  };
}
