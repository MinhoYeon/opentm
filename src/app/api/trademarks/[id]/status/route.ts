import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabaseAdminClient";
import { createServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin/roles";
import {
  TrademarkStatus,
  canTransitionStatus,
  isTrademarkStatus,
  shouldSetFiledAt,
  shouldSetPaymentReceivedAt,
} from "@/lib/trademarks/status";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const serverClient = createServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await serverClient.auth.getSession();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!isAdminUser(session.user)) {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  let payload: UpdateStatusPayload;
  try {
    payload = (await request.json()) as UpdateStatusPayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: current, error: fetchError } = await adminClient
    .from("trademark_applications")
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

  if (!canTransitionStatus(currentStatus, nextStatus)) {
    return NextResponse.json({ error: "허용되지 않은 상태 전이입니다." }, { status: 422 });
  }

  const updateFields: Record<string, unknown> = {
    status: nextStatus,
    status_updated_at: new Date().toISOString(),
  };

  const statusDetail = parseOptionalString(payload.statusDetail);
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

  if (shouldSetPaymentReceivedAt(nextStatus)) {
    const parsedPaymentReceivedAt = payload.paymentReceivedAt
      ? parseDate(payload.paymentReceivedAt)
      : null;
    updateFields.payment_received_at = parsedPaymentReceivedAt ?? new Date().toISOString();
  } else if (payload.paymentReceivedAt !== undefined) {
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
    .from("trademark_applications")
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
    application_id: id,
    from_status: currentStatus,
    to_status: nextStatus,
    note,
    metadata,
    changed_by: session.user.id,
  });

  return NextResponse.json({ application: updated });
}
