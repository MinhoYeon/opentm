import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/api/auth";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { createBankConfirmationRequest } from "@/lib/payments/db";
import { notifyBankTransferRequest } from "@/lib/payments/notifications";

type BankConfirmationPayload = {
  orderId: string;
  note?: string;
};

function parsePayload(value: unknown): BankConfirmationPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("요청 본문이 필요합니다.", { status: 400 });
  }

  const { orderId, note } = value as Partial<BankConfirmationPayload>;

  if (typeof orderId !== "string" || !orderId.trim()) {
    throw new ApiError("orderId 값이 필요합니다.", { status: 400 });
  }

  return {
    orderId: orderId.trim(),
    note: typeof note === "string" ? note.trim() : undefined,
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuthenticatedSession();
    const payload = parsePayload(await request.json());

    await createBankConfirmationRequest({
      orderId: payload.orderId,
      userId: session.user.id,
      note: payload.note ?? null,
    });

    await notifyBankTransferRequest({
      orderId: payload.orderId,
      userEmail: session.user.email,
      userName: session.user.user_metadata?.name as string | undefined,
      note: payload.note ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "payments:bank");
  }
}
