import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/api/auth";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { upsertPaymentIntent } from "@/lib/payments/db";
import { callTossApi } from "@/lib/payments/toss";

type PreparePayload = {
  orderId: string;
  amount: number;
  orderName: string;
  successUrl: string;
  failUrl: string;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerMobilePhone?: string;
  applicationId?: string;
  metadata?: Record<string, unknown>;
};

function extractString(value: unknown, field: string, required = true): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed && required) {
      throw new ApiError(`${field} 값이 필요합니다.`, { status: 400 });
    }
    return trimmed || null;
  }

  if (required) {
    throw new ApiError(`${field} 값이 필요합니다.`, { status: 400 });
  }

  return null;
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new ApiError("결제 금액이 올바르지 않습니다.", { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthenticatedSession();
    const body = (await request.json()) as Partial<PreparePayload> | null;

    if (!body || typeof body !== "object") {
      throw new ApiError("요청 본문이 필요합니다.", { status: 400 });
    }

    const orderId = extractString(body.orderId, "orderId");
    const orderName = extractString(body.orderName, "orderName");
    const successUrl = extractString(body.successUrl, "successUrl");
    const failUrl = extractString(body.failUrl, "failUrl");
    const amount = parseAmount(body.amount);
    const currency = extractString(body.currency, "currency", false) ?? "KRW";
    const applicationId = extractString(body.applicationId, "applicationId", false);

    if (amount <= 0) {
      throw new ApiError("결제 금액은 0보다 커야 합니다.", { status: 400 });
    }

    const tossPayload: Record<string, unknown> = {
      orderId,
      amount,
      orderName,
      successUrl,
      failUrl,
      currency,
    };

    const optionalFields: Array<[string, unknown]> = [
      ["customerName", body.customerName],
      ["customerEmail", body.customerEmail],
      ["customerMobilePhone", body.customerMobilePhone],
    ];

    for (const [key, value] of optionalFields) {
      if (typeof value === "string" && value.trim()) {
        tossPayload[key] = value.trim();
      }
    }

    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : null;
    if (metadata) {
      tossPayload.metadata = metadata;
    }

    const tossResponse = (await callTossApi<Record<string, unknown>>("/v1/payments", {
      method: "POST",
      body: tossPayload,
    })) ?? null;

    await upsertPaymentIntent({
      orderId,
      amount,
      currency,
      userId: session.user.id,
      applicationId,
      rawRequest: tossPayload,
      rawResponse: tossResponse,
      metadata,
    });

    return NextResponse.json({ ok: true, data: tossResponse });
  } catch (error) {
    return handleApiError(error, "payments:toss:prepare");
  }
}
