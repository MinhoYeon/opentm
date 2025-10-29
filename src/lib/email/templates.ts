/**
 * 이메일 템플릿 생성 함수들
 */

import type {
  QuoteEmailData,
  PaymentConfirmedEmailData,
  PaymentReminderEmailData,
} from "@/types/email";

function formatCurrency(amount: number, currency = "KRW"): string {
  try {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString()}원`;
  }
}

function formatDate(dateString: string): string {
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString));
  } catch {
    return dateString;
  }
}

function getBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
      line-height: 1.6;
      color: #334155;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .info-box {
      background-color: #f8fafc;
      border-left: 4px solid #6366f1;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #64748b;
    }
    .value {
      color: #0f172a;
      font-weight: 500;
    }
    .highlight {
      font-size: 28px;
      font-weight: 700;
      color: #6366f1;
      margin: 16px 0;
    }
    .button {
      display: inline-block;
      background-color: #6366f1;
      color: white;
      padding: 12px 32px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 16px 0;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .alert {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
      color: #991b1b;
    }
    .success {
      background-color: #f0fdf4;
      border-left: 4px solid #22c55e;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
      color: #166534;
    }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      ${content}
      <div class="footer">
        <p>본 메일은 발신 전용입니다. 문의사항은 고객센터로 연락 주세요.</p>
        <p style="margin-top: 8px; font-size: 12px;">
          © 2025 상표출원시스템. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * 견적서 발송 이메일 템플릿
 */
export function generateQuoteEmail(data: QuoteEmailData): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>📋 견적서가 발송되었습니다</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.applicantName}</strong>님.</p>
      <p>상표 "<strong>${data.brandName}</strong>"에 대한 ${data.paymentStageLabel} 견적서가 발송되었습니다.</p>

      <div class="info-box">
        <div class="info-row">
          <span class="label">상표명</span>
          <span class="value">${data.brandName}</span>
        </div>
        ${
          data.managementNumber
            ? `
        <div class="info-row">
          <span class="label">관리번호</span>
          <span class="value">${data.managementNumber}</span>
        </div>
        `
            : ""
        }
        <div class="info-row">
          <span class="label">결제 단계</span>
          <span class="value">${data.paymentStageLabel}</span>
        </div>
        <div class="info-row">
          <span class="label">견적 금액</span>
          <span class="value highlight">${formatCurrency(data.amount, data.currency)}</span>
        </div>
        <div class="info-row">
          <span class="label">납부 기한</span>
          <span class="value">${formatDate(data.dueDate)}</span>
        </div>
      </div>

      <div class="alert">
        <strong>⚠️ 납부 안내</strong><br>
        납부 기한 내에 입금이 확인되지 않으면 출원 진행이 지연될 수 있습니다.<br>
        입금 후 담당자에게 연락 주시면 빠른 처리가 가능합니다.
      </div>

      <p style="margin-top: 24px;">
        입금 계좌 정보는 담당 변리사로부터 별도로 안내받으실 수 있습니다.
      </p>

      <p style="margin-top: 32px; color: #64748b; font-size: 14px;">
        문의사항이 있으시면 언제든지 연락 주시기 바랍니다.
      </p>
    </div>
  `;

  return {
    subject: `[상표출원] ${data.brandName} - ${data.paymentStageLabel} 견적서 발송`,
    html: getBaseTemplate(content),
  };
}

/**
 * 입금 확인 이메일 템플릿
 */
export function generatePaymentConfirmedEmail(
  data: PaymentConfirmedEmailData
): { subject: string; html: string } {
  const content = `
    <div class="header">
      <h1>✅ 입금이 확인되었습니다</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.applicantName}</strong>님.</p>
      <p>상표 "<strong>${data.brandName}</strong>"에 대한 ${data.paymentStageLabel} 입금이 확인되었습니다.</p>

      <div class="success">
        <strong>✓ 입금 완료</strong><br>
        정상적으로 입금이 확인되었습니다. 곧 다음 단계로 진행됩니다.
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="label">상표명</span>
          <span class="value">${data.brandName}</span>
        </div>
        ${
          data.managementNumber
            ? `
        <div class="info-row">
          <span class="label">관리번호</span>
          <span class="value">${data.managementNumber}</span>
        </div>
        `
            : ""
        }
        <div class="info-row">
          <span class="label">결제 단계</span>
          <span class="value">${data.paymentStageLabel}</span>
        </div>
        <div class="info-row">
          <span class="label">입금 금액</span>
          <span class="value highlight">${formatCurrency(data.paidAmount, data.currency)}</span>
        </div>
        <div class="info-row">
          <span class="label">입금 일시</span>
          <span class="value">${formatDate(data.paidAt)}</span>
        </div>
        ${
          data.remitterName
            ? `
        <div class="info-row">
          <span class="label">입금자명</span>
          <span class="value">${data.remitterName}</span>
        </div>
        `
            : ""
        }
      </div>

      <p style="margin-top: 24px;">
        입금이 확인되었으며, 담당 변리사가 곧 다음 단계를 진행할 예정입니다.
        진행 상황은 마이페이지에서 확인하실 수 있습니다.
      </p>

      <p style="margin-top: 32px; color: #64748b; font-size: 14px;">
        감사합니다.
      </p>
    </div>
  `;

  return {
    subject: `[상표출원] ${data.brandName} - ${data.paymentStageLabel} 입금 확인`,
    html: getBaseTemplate(content),
  };
}

/**
 * 결제 기한 임박 알림 이메일 템플릿
 */
export function generatePaymentReminderEmail(
  data: PaymentReminderEmailData
): { subject: string; html: string } {
  const isOverdue = data.daysUntilDue < 0;
  const urgencyLevel = isOverdue
    ? "overdue"
    : data.daysUntilDue <= 1
    ? "urgent"
    : data.daysUntilDue <= 3
    ? "warning"
    : "info";

  const urgencyText = isOverdue
    ? `<strong style="color: #dc2626;">납부 기한이 ${Math.abs(data.daysUntilDue)}일 지났습니다!</strong>`
    : data.daysUntilDue === 0
    ? `<strong style="color: #ea580c;">오늘이 납부 기한입니다!</strong>`
    : data.daysUntilDue === 1
    ? `<strong style="color: #f59e0b;">내일이 납부 기한입니다!</strong>`
    : `<strong>납부 기한이 ${data.daysUntilDue}일 남았습니다.</strong>`;

  const content = `
    <div class="header">
      <h1>${isOverdue ? "🚨" : "⏰"} 결제 기한 ${isOverdue ? "초과" : "임박"} 알림</h1>
    </div>
    <div class="content">
      <p>안녕하세요, <strong>${data.applicantName}</strong>님.</p>
      <p>상표 "<strong>${data.brandName}</strong>"에 대한 ${data.paymentStageLabel} 납부 기한이 ${
    isOverdue ? "초과되었습니다" : "임박했습니다"
  }.</p>

      <div class="${isOverdue ? "alert" : "info-box"}" style="${
    !isOverdue && urgencyLevel === "urgent" ? "border-left-color: #f59e0b;" : ""
  }">
        ${urgencyText}
      </div>

      <div class="info-box">
        <div class="info-row">
          <span class="label">상표명</span>
          <span class="value">${data.brandName}</span>
        </div>
        ${
          data.managementNumber
            ? `
        <div class="info-row">
          <span class="label">관리번호</span>
          <span class="value">${data.managementNumber}</span>
        </div>
        `
            : ""
        }
        <div class="info-row">
          <span class="label">결제 단계</span>
          <span class="value">${data.paymentStageLabel}</span>
        </div>
        <div class="info-row">
          <span class="label">미납 금액</span>
          <span class="value highlight">${formatCurrency(data.unpaidAmount, data.currency)}</span>
        </div>
        <div class="info-row">
          <span class="label">납부 기한</span>
          <span class="value" style="color: ${isOverdue ? "#dc2626" : "#0f172a"}; font-weight: 700;">
            ${formatDate(data.dueDate)}
          </span>
        </div>
      </div>

      ${
        isOverdue
          ? `
      <div class="alert">
        <strong>⚠️ 중요 안내</strong><br>
        납부 기한이 지났습니다. 지연될 경우 출원 진행에 차질이 생길 수 있으니<br>
        빠른 시일 내에 입금 부탁드립니다.
      </div>
      `
          : `
      <p style="margin-top: 24px;">
        기한 내 입금이 확인되지 않으면 출원 진행이 지연될 수 있으니 참고 부탁드립니다.
      </p>
      `
      }

      <p style="margin-top: 24px;">
        입금 후 담당자에게 연락 주시면 빠른 확인이 가능합니다.
      </p>

      <p style="margin-top: 32px; color: #64748b; font-size: 14px;">
        문의사항이 있으시면 언제든지 연락 주시기 바랍니다.
      </p>
    </div>
  `;

  return {
    subject: `[상표출원] ${data.brandName} - ${
      isOverdue ? "결제 기한 초과" : `결제 기한 ${data.daysUntilDue}일 전`
    } 알림`,
    html: getBaseTemplate(content),
  };
}
