import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext, requireAuthenticatedSession } from "@/lib/api/auth";
import { ApiError, handleApiError } from "@/lib/api/errors";
import {
  createBankConfirmationRequest,
  listBankTransferReviews,
  updateBankTransferReview,
  type BankTransferReview,
} from "@/lib/payments/db";
import { notifyDepositReview } from "@/lib/payments/notifications";

function parseString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildAdminReviewUrl(): string {
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  try {
    if (baseUrl) {
      return new URL("/admin/payments/bank-transfer", baseUrl).toString();
    }
  } catch {
    // ignore invalid base url
  }
  return "/admin/payments/bank-transfer";
}

type CustomerPayload = {
  orderId: string;
  note?: string | null;
  depositorName?: string | null;
  scheduledDate?: string | null;
};

type AdminReviewPayload = {
  paymentId: string;
  confirmationId?: number;
  status: "confirmed" | "rejected";
  memo?: string | null;
};

function parseCustomerPayload(body: Record<string, unknown>): CustomerPayload {
  const orderId = parseString(body.orderId);
  if (!orderId) {
    throw new ApiError("orderId 값이 필요합니다.", { status: 400 });
  }
  return {
    orderId,
    note: parseString(body.note),
    depositorName: parseString(body.depositorName),
    scheduledDate: parseString(body.scheduledDate),
  };
}

function parseAdminPayload(body: Record<string, unknown>): AdminReviewPayload {
  const paymentId = parseString(body.paymentId);
  const statusRaw = parseString(body.status);
  if (!paymentId || !statusRaw) {
    throw new ApiError("paymentId와 status 값이 필요합니다.", { status: 400 });
  }
  if (statusRaw !== "confirmed" && statusRaw !== "rejected") {
    throw new ApiError("status 값이 올바르지 않습니다.", { status: 400 });
  }
  const confirmationId = typeof body.confirmationId === "number" ? body.confirmationId : undefined;
  return {
    paymentId,
    confirmationId,
    status: statusRaw,
    memo: parseString(body.memo),
  };
}

async function handleCustomerRequest(body: Record<string, unknown>) {
  const session = await requireAuthenticatedSession();
  const payload = parseCustomerPayload(body);
  const result = await createBankConfirmationRequest({
    orderId: payload.orderId,
    userId: session.user.id,
    note: payload.note ?? null,
    depositorName: payload.depositorName ?? null,
    scheduledDate: payload.scheduledDate ?? null,
  });

  const requesterName =
    (typeof session.user.user_metadata?.name === "string" && session.user.user_metadata.name) ||
    (typeof session.user.user_metadata?.full_name === "string" && session.user.user_metadata.full_name) ||
    session.user.email ||
    session.user.id;

  await notifyDepositReview({
    orderId: result.orderId,
    payerName: result.depositorName ?? payload.depositorName ?? "미기재",
    amount: result.amount,
    bankName: result.bankAccount.bankName ?? "확인 필요",
    accountNumber: result.bankAccount.accountNumber ?? "확인 필요",
    requestedBy: requesterName,
    adminReviewUrl: buildAdminReviewUrl(),
    memo: payload.note ?? undefined,
  });

  return NextResponse.json({ ok: true, confirmationId: result.confirmationId });
}

async function resolvePendingConfirmationId(paymentId: string): Promise<number> {
  const reviews = await listBankTransferReviews({ statuses: ["pending"] });
  const match = reviews.find((item) => item.paymentId === paymentId);
  if (!match) {
    throw new ApiError("대기 중인 입금 확인 요청을 찾을 수 없습니다.", { status: 404 });
  }
  return match.confirmationId;
}

function serializeReview(review: BankTransferReview | null) {
  if (!review) {
    return null;
  }
  return {
    confirmationId: review.confirmationId,
    paymentId: review.paymentId,
    orderId: review.orderId,
    amount: review.amount,
    currency: review.currency,
    status: review.status,
    paymentStatus: review.paymentStatus,
    requestedAt: review.requestedAt,
    processedAt: review.processedAt,
    processedBy: review.processedBy,
    memo: review.memo,
    note: review.note,
    depositorName: review.depositorName,
    scheduledDate: review.scheduledDate,
    bankAccount: review.bankAccount,
    requestedBy: review.requestedBy,
  };
}

async function handleAdminRequest(body: Record<string, unknown>) {
  const { session } = await requireAdminContext({
    allowedRoles: ["super_admin", "finance_admin", "operations_admin"],
  });
  const payload = parseAdminPayload(body);
  const confirmationId =
    payload.confirmationId ?? (await resolvePendingConfirmationId(payload.paymentId));

  const updated = await updateBankTransferReview({
    confirmationId,
    paymentId: payload.paymentId,
    status: payload.status,
    confirmedBy: session.user.id,
    memo: payload.memo ?? null,
  });

  if (!updated) {
    throw new ApiError("입금 확인 요청을 찾을 수 없습니다.", { status: 404 });
  }

  return NextResponse.json({ ok: true, review: serializeReview(updated) });
}

export async function PATCH(request: NextRequest) {
  try {
    const json = (await request.json()) as Record<string, unknown>;
    if (json && typeof json === "object" && ("paymentId" in json || "status" in json)) {
      return await handleAdminRequest(json);
    }
    return await handleCustomerRequest(json ?? {});
  } catch (error) {
    return handleApiError(error, "payments:bank");
  }
}
