import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/api/errors";
import { recordWebhookEvent, updateIntentStatus } from "@/lib/payments/db";
import { verifyTossWebhookSignature } from "@/lib/payments/toss";

type TossWebhookPayload = {
  orderId?: string;
  eventType?: string;
  status?: string;
  paymentKey?: string;
} & Record<string, unknown>;

function mapStatus(status: string): string | null {
  switch (status) {
    case "DONE":
    case "SUCCESS":
      return "confirmed";
    case "CANCELED":
    case "CANCELLED":
      return "cancelled";
    case "WAITING_FOR_DEPOSIT":
    case "READY":
      return "pending_virtual_account";
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature =
      request.headers.get("toss-signature") ??
      request.headers.get("x-toss-signature") ??
      request.headers.get("toss-signature-v2");

    verifyTossWebhookSignature(signature, rawBody);

    let parsed: unknown;
    try {
      parsed = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      throw new ApiError("Webhook 본문이 JSON 형식이 아닙니다.", { status: 400 });
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new ApiError("Webhook 본문이 올바르지 않습니다.", { status: 400 });
    }

    const payload = parsed as TossWebhookPayload;
    const orderId = typeof payload.orderId === "string" ? payload.orderId.trim() : "";

    if (!orderId) {
      throw new ApiError("orderId가 누락되었습니다.", { status: 400 });
    }

    const eventType = typeof payload.eventType === "string" ? payload.eventType : "unknown";
    const status = typeof payload.status === "string" ? payload.status : null;
    const paymentKey = typeof payload.paymentKey === "string" ? payload.paymentKey : null;

    await recordWebhookEvent({
      orderId,
      eventType,
      status,
      signature,
      payload,
    });

    if (status) {
      const mapped = mapStatus(status);
      if (mapped) {
        await updateIntentStatus({
          orderId,
          status: mapped,
          lastWebhookType: eventType,
          paymentKey: paymentKey ?? undefined,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "payments:toss:webhook");
  }
}
