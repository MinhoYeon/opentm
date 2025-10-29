import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import {
  TrademarkStatus,
  canTransitionStatus,
  isTrademarkStatus,
  shouldSetFiledAt,
} from "@/lib/trademarks/status";
import { TRADEMARK_STATUS_VALUES } from "@/types/status";

function parseOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

type UpdateStatusPayload = {
  status?: string;
  note?: string | null;
  statusDetail?: string | null;
  metadata?: Record<string, unknown> | null;
  paymentReference?: string | null;
  paymentReceivedAt?: string | null;
  filingReceiptNumber?: string | null;
  filingSubmissionReference?: string | null;
  filedAt?: string | null;
};

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const params = "then" in context.params ? await context.params : context.params;
  const { id } = params;

  if (!id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { session } = await requireAdminContext({ allowedRoles: ["super_admin", "operations_admin"] });

  let payload: UpdateStatusPayload;
  try {
    payload = (await request.json()) as UpdateStatusPayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: current, error: fetchError } = await adminClient
    .from("trademark_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!current) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }

  const nextStatusRaw = payload.status;
  if (!nextStatusRaw || !isTrademarkStatus(nextStatusRaw)) {
    return NextResponse.json({ error: "유효한 상태가 필요합니다." }, { status: 400 });
  }

  const currentStatus = current.status as TrademarkStatus;
  const nextStatus = nextStatusRaw as TrademarkStatus;

  const statusDetail = parseOptionalString(payload.statusDetail);
  const isRegression =
    TRADEMARK_STATUS_VALUES.indexOf(nextStatus) < TRADEMARK_STATUS_VALUES.indexOf(currentStatus);

  // 관리자는 상태 전이 제약 없이 모든 상태로 변경 가능
  // 단, 상태를 되돌릴 때는 메모 필수
  if (isRegression && !statusDetail) {
    return NextResponse.json({ error: "상태를 되돌릴 때는 상세 메모를 남겨야 합니다." }, { status: 422 });
  }

  // 일반적인 전이가 아닌 경우 로그 기록 (관리자는 허용)
  if (!canTransitionStatus(currentStatus, nextStatus)) {
    console.warn(`Non-standard status transition: ${currentStatus} -> ${nextStatus} by admin ${session.user.id}`);
  }

  const updateFields: Record<string, unknown> = {
    status: nextStatus,
    status_updated_at: new Date().toISOString(),
  };

  if (payload.statusDetail !== undefined) {
    updateFields.status_detail = statusDetail;
  }

  const paymentReference = parseOptionalString(payload.paymentReference);
  if (payload.paymentReference !== undefined) {
    updateFields.payment_reference = paymentReference;
  }

  const filingReceiptNumber = parseOptionalString(payload.filingReceiptNumber);
  if (payload.filingReceiptNumber !== undefined) {
    updateFields.filing_receipt_number = filingReceiptNumber;
  }

  const filingSubmissionReference = parseOptionalString(payload.filingSubmissionReference);
  if (payload.filingSubmissionReference !== undefined) {
    updateFields.filing_submission_reference = filingSubmissionReference;
  }

  // payment_received_at can be set manually if provided in payload
  if (payload.paymentReceivedAt !== undefined) {
    updateFields.payment_received_at = parseDate(payload.paymentReceivedAt);
  }

  if (shouldSetFiledAt(nextStatus)) {
    const parsedFiledAt = payload.filedAt ? parseDate(payload.filedAt) : null;
    const filedAt = parsedFiledAt ?? new Date().toISOString();
    updateFields.filed_at = filedAt;
    updateFields.filing_submitted_at = filedAt;
  } else if (payload.filedAt !== undefined) {
    const filedAt = parseDate(payload.filedAt);
    updateFields.filed_at = filedAt;
    updateFields.filing_submitted_at = filedAt;
  }

  const { data: updated, error: updateError } = await adminClient
    .from("trademark_requests")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const note = parseOptionalString(payload.note);
  const metadata = payload.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)
    ? payload.metadata
    : {};

  await adminClient.from("trademark_status_logs").insert({
    request_id: id,
    from_status: currentStatus,
    to_status: nextStatus,
    note,
    metadata,
    changed_by: session.user.id,
  });

  return NextResponse.json({ request: updated });
}
