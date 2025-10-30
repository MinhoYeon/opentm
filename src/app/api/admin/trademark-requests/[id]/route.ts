import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

/**
 * DELETE /api/admin/trademark-requests/:id
 * 상표 요청 삭제 (관리자 전용)
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  await requireAdminContext();
  const params = "then" in context.params ? await context.params : context.params;
  const requestId = params.id;

  const adminClient = createAdminClient();

  // 1. trademark_request 존재 여부 확인
  const { data: trademarkRequest, error: fetchError } = await adminClient
    .from("trademark_requests")
    .select("id, brand_name")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!trademarkRequest) {
    return NextResponse.json({ error: "상표 요청을 찾을 수 없습니다." }, { status: 404 });
  }

  // 2. 관련 데이터 삭제 (trademark_request_applicants)
  // CASCADE로 설정되어 있다면 자동 삭제되지만, 명시적으로 삭제
  const { error: applicantsError } = await adminClient
    .from("trademark_request_applicants")
    .delete()
    .eq("request_id", requestId);

  if (applicantsError) {
    console.error("Failed to delete trademark_request_applicants:", applicantsError);
    // 계속 진행 (CASCADE가 처리할 수 있음)
  }

  // 3. trademark_request 삭제
  const { error: deleteError } = await adminClient
    .from("trademark_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    return NextResponse.json(
      { error: `삭제 실패: ${deleteError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `"${trademarkRequest.brand_name}" 상표 요청이 삭제되었습니다.`,
  });
}
