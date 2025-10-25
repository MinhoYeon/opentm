import { ApiError } from "@/lib/api/errors";

export type DepositReviewNotification = {
  orderId: string;
  payerName: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  requestedBy: string;
  adminReviewUrl: string;
  memo?: string | null;
};

async function postWebhook(url: string, payload: Record<string, unknown>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError("관리자 알림 전송에 실패했습니다.", {
      status: 502,
      details: await response.text(),
      expose: false,
    });
  }
}

function formatCurrency(amount: number) {
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(amount))}원`;
}

export async function notifyDepositReview(params: DepositReviewNotification) {
  const webhookUrl = process.env.SLACK_INCOMING_WEBHOOK_URL;

  const message = {
    text: `[입금 확인 요청] ${params.orderId}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*:rotating_light: 입금 확인 요청이 도착했습니다*",
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*입금자명*\\n${params.payerName}` },
          { type: "mrkdwn", text: `*금액*\\n${formatCurrency(params.amount)}` },
          { type: "mrkdwn", text: `*계좌*\\n${params.bankName} ${params.accountNumber}` },
          { type: "mrkdwn", text: `*요청자*\\n${params.requestedBy}` },
        ],
      },
    ] as Array<Record<string, unknown>>,
  };

  if (params.memo) {
    message.blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*메모*\\n${params.memo}`,
      },
    });
  }

  message.blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "관리자 확인 페이지" },
        url: params.adminReviewUrl,
      },
    ],
  });

  if (!webhookUrl) {
    console.info("[payments] Deposit review notification", message);
    return;
  }

  await postWebhook(webhookUrl, message);
}

export const notifyBankTransferRequest = notifyDepositReview;
