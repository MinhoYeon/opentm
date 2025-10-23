import { ApiError } from "@/lib/api/errors";

type NotifyBankTransferParams = {
  orderId: string;
  userEmail?: string | null;
  userName?: string | null;
  note?: string | null;
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

export async function notifyBankTransferRequest(params: NotifyBankTransferParams) {
  const webhookUrl = process.env.ADMIN_NOTIFICATION_WEBHOOK_URL;

  const message = {
    type: "bank_transfer_confirmation_request",
    orderId: params.orderId,
    userEmail: params.userEmail ?? null,
    userName: params.userName ?? null,
    note: params.note ?? null,
    requestedAt: new Date().toISOString(),
  };

  if (!webhookUrl) {
    console.info("[payments] Bank transfer confirmation request", message);
    return;
  }

  await postWebhook(webhookUrl, message);
}
