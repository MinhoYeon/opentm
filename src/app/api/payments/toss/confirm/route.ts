import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/api/auth";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { confirmPaymentIntent } from "@/lib/payments/db";
import { callTossApi } from "@/lib/payments/toss";

type ConfirmPayload = {
  paymentKey: string;
  orderId: string;
  amount: number;
};

function parsePayload(value: unknown): ConfirmPayload {
  if (!value || typeof value !== "object") {
    throw new ApiError("요청 본문이 필요합니다.", { status: 400 });
  }

  const { paymentKey, orderId, amount } = value as Partial<ConfirmPayload>;

  if (typeof paymentKey !== "string" || !paymentKey.trim()) {
    throw new ApiError("paymentKey 값이 필요합니다.", { status: 400 });
  }

  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new ApiError("orderId 값이 필요합니다.", { status: 400 });
  }

  let parsedAmount: number | null = null;
  if (typeof amount === "number" && Number.isFinite(amount)) {
    parsedAmount = amount;
  } else if (typeof amount === "string") {
    const numeric = Number.parseFloat(amount);
    if (Number.isFinite(numeric)) {
      parsedAmount = numeric;
    }
  }

  if (!parsedAmount || parsedAmount <= 0) {
    throw new ApiError("amount 값이 올바르지 않습니다.", { status: 400 });
  }

  return {
    paymentKey: paymentKey.trim(),
    orderId: orderId.trim(),
    amount: parsedAmount,
  };
}

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedSession();
    const payload = parsePayload(await request.json());

    const tossResponse = await callTossApi<Record<string, unknown>>("/v1/payments/confirm", {
      method: "POST",
      body: payload,
    });

    const confirmed = await confirmPaymentIntent({
      orderId: payload.orderId,
      paymentKey: payload.paymentKey,
      amount: payload.amount,
      confirmResponse: tossResponse,
    });

    if (!confirmed) {
      throw new ApiError('결제 정보를 찾을 수 없습니다.', { status: 404 });
    }

    return NextResponse.json({ ok: true, data: tossResponse, intent: confirmed });
  } catch (error) {
    return handleApiError(error, "payments:toss:confirm");
  }
}
