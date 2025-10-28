import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * POST /api/admin/trademark-applications/:id/unapprove
 * trademark_application을 삭제하고 원래 request로 되돌림
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { session } = await requireAdminContext();
  const params = "then" in context.params ? await context.params : context.params;
  const applicationId = params.id;

  const adminClient = createAdminClient();

  // 1. trademark_application 조회
  const { data: application, error: fetchError } = await adminClient
    .from("trademark_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!application) {
    return NextResponse.json({ error: "출원을 찾을 수 없습니다." }, { status: 404 });
  }

  // 2. request_id가 있는지 확인
  if (!application.request_id) {
    return NextResponse.json(
      { error: "원본 신청서가 없는 출원은 해제할 수 없습니다." },
      { status: 400 }
    );
  }

  // 3. trademark_request 조회
  const { data: trademarkRequest } = await adminClient
    .from("trademark_requests")
    .select("id, status")
    .eq("id", application.request_id)
    .maybeSingle();

  if (!trademarkRequest) {
    return NextResponse.json(
      { error: "원본 신청서를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  // 4. trademark_application 삭제 (cascade로 status_logs도 삭제됨)
  const { error: deleteError } = await adminClient
    .from("trademark_applications")
    .delete()
    .eq("id", applicationId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 5. trademark_request 상태를 다시 submitted로 변경
  await adminClient
    .from("trademark_requests")
    .update({
      status: "submitted",
      status_detail: "관리자가 승인 해제함",
      status_updated_at: now,
    })
    .eq("id", application.request_id);

  return NextResponse.json({
    success: true,
    message: "승인이 해제되었습니다.",
    request_id: application.request_id,
  });
}
