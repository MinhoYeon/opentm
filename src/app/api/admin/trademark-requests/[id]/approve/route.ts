import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * POST /api/admin/trademark-requests/:id/approve
 * 신청서를 trademark_applications로 승인 처리
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { session } = await requireAdminContext();
  const params = "then" in context.params ? await context.params : context.params;
  const requestId = params.id;

  const adminClient = createAdminClient();

  // 1. trademark_request 조회
  const { data: trademarkRequest, error: fetchError } = await adminClient
    .from("trademark_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!trademarkRequest) {
    return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  }

  // 2. 이미 trademark_applications가 생성되었는지 확인
  const { data: existingApp } = await adminClient
    .from("trademark_applications")
    .select("id, management_number")
    .eq("request_id", requestId)
    .maybeSingle();

  if (existingApp) {
    return NextResponse.json(
      {
        message: "이미 승인된 신청서입니다.",
        application: existingApp,
      },
      { status: 200 }
    );
  }

  // 3. trademark_applications 생성
  const submittedAt = new Date().toISOString();
  const { data: application, error: appError } = await adminClient
    .from("trademark_applications")
    .insert({
      request_id: requestId,
      user_id: trademarkRequest.user_id,
      brand_name: trademarkRequest.brand_name,
      trademark_type: trademarkRequest.trademark_type,
      product_classes: trademarkRequest.product_classes,
      goods_description: trademarkRequest.additional_notes,
      status: "awaiting_payment",
      status_detail: "결제 대기 중입니다.",
      status_updated_at: submittedAt,
      payment_amount: 350000, // 기본 금액
      payment_currency: "KRW",
      payment_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        approved_by_admin: true,
        approved_by: session.user.id,
        image_url: trademarkRequest.image_url,
      },
    })
    .select()
    .single();

  if (appError) {
    return NextResponse.json({ error: appError.message }, { status: 500 });
  }

  // 4. 상태 로그 생성
  await adminClient.from("trademark_status_logs").insert({
    application_id: application.id,
    from_status: null,
    to_status: application.status,
    changed_by: session.user.id,
    note: "관리자가 수동으로 승인",
    metadata: { request_id: requestId },
  });

  // 5. trademark_request 상태 업데이트
  await adminClient
    .from("trademark_requests")
    .update({
      status: "approved",
      status_detail: "승인되어 출원 관리로 전환됨",
      status_updated_at: submittedAt,
    })
    .eq("id", requestId);

  return NextResponse.json({
    success: true,
    message: "신청서가 승인되었습니다.",
    application,
  });
}
