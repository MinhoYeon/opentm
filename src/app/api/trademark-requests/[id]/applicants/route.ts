import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabaseServerClient";
import {
  handlePostgrestError,
  logAuditFailure,
  logAuditSuccess,
} from "@/server/db/applicants";

function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

type AttachBody = {
  applicantIds?: unknown;
};

function parseAttachBody(body: AttachBody): string[] {
  if (!Array.isArray(body.applicantIds)) {
    throw new Error("applicantIds must be an array");
  }

  const ids = body.applicantIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  if (ids.length === 0) {
    throw new Error("최소 1명의 출원인을 선택해 주세요.");
  }

  return ids;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createServerClient("mutable");
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return ok({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    return ok({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { id: requestId } = await params;

  let applicantIds: string[];
  try {
    const json = (await request.json()) as AttachBody;
    applicantIds = parseAttachBody(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 본문을 확인해 주세요.";
    logAuditFailure({
      userId: user.id,
      operation: "trademark-request:attach-applicants",
      targetIds: [requestId],
      message,
    });
    return ok({ error: message }, { status: 400 });
  }

  try {
    // Verify request exists and belongs to user
    const { data: requestRow, error: requestError } = await supabase
      .from("trademark_requests")
      .select("id")
      .eq("id", requestId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (requestError) {
      throw handlePostgrestError(requestError);
    }

    if (!requestRow) {
      return ok({ error: "상표 출원 요청을 찾을 수 없습니다." }, { status: 404 });
    }

    // Verify all applicants exist and belong to user
    const { data: applicantRows, error: applicantError } = await supabase
      .from("applicants")
      .select("id")
      .in("id", applicantIds)
      .eq("user_id", user.id);

    if (applicantError) {
      throw handlePostgrestError(applicantError);
    }

    if (!applicantRows || applicantRows.length !== applicantIds.length) {
      return ok({ error: "일부 출원인을 찾을 수 없습니다." }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Delete existing applicants for this request
    const { error: deleteError } = await supabase
      .from("trademark_request_applicants")
      .delete()
      .eq("request_id", requestId)
      .eq("user_id", user.id);

    if (deleteError) {
      throw handlePostgrestError(deleteError);
    }

    // Insert new applicants
    const insertData = applicantIds.map((applicantId) => ({
      request_id: requestId,
      applicant_id: applicantId,
      user_id: user.id,
      created_at: now,
      updated_at: now,
    }));

    const { error: insertError } = await supabase
      .from("trademark_request_applicants")
      .insert(insertData);

    if (insertError) {
      throw handlePostgrestError(insertError);
    }

    // Update last_used_at for all applicants
    const { error: updateError } = await supabase
      .from("applicants")
      .update({ last_used_at: now })
      .in("id", applicantIds)
      .eq("user_id", user.id);

    if (updateError) {
      throw handlePostgrestError(updateError);
    }

    logAuditSuccess({
      userId: user.id,
      operation: "trademark-request:attach-applicants",
      targetIds: [requestId],
      metadata: { applicantIds, count: applicantIds.length },
    });

    return ok({ ok: true, count: applicantIds.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "출원인을 연결하지 못했습니다.";
    logAuditFailure({
      userId: user.id,
      operation: "trademark-request:attach-applicants",
      targetIds: [requestId],
      metadata: { applicantIds },
      message,
    });
    return ok({ error: message }, { status: 500 });
  }
}
