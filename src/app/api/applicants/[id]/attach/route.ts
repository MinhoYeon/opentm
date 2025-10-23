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
  requestId?: unknown;
};

function parseAttachBody(body: AttachBody) {
  if (typeof body.requestId !== "string" || !body.requestId.trim()) {
    throw new Error("요청 ID를 확인해 주세요.");
  }
  return body.requestId.trim();
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient();
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

  let requestId: string;
  try {
    const json = (await request.json()) as AttachBody;
    requestId = parseAttachBody(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 본문을 확인해 주세요.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:attach-request",
      targetIds: [params.id],
      message,
    });
    return ok({ error: message }, { status: 400 });
  }

  const applicantId = params.id;

  try {
    const { data: applicant, error: applicantError } = await supabase
      .from("applicants")
      .select("id")
      .eq("id", applicantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (applicantError) {
      throw handlePostgrestError(applicantError);
    }

    if (!applicant) {
      return ok({ error: "출원인을 찾을 수 없습니다." }, { status: 404 });
    }

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

    const now = new Date().toISOString();

    const { error: upsertError } = await supabase
      .from("trademark_request_applicants")
      .upsert(
        {
          request_id: requestId,
          applicant_id: applicantId,
          user_id: user.id,
          updated_at: now,
        },
        { onConflict: "request_id" }
      );

    if (upsertError) {
      throw handlePostgrestError(upsertError);
    }

    const { error: updateError } = await supabase
      .from("applicants")
      .update({ last_used_at: now })
      .eq("id", applicantId)
      .eq("user_id", user.id);

    if (updateError) {
      throw handlePostgrestError(updateError);
    }

    logAuditSuccess({
      userId: user.id,
      operation: "applicant:attach-request",
      targetIds: [applicantId],
      metadata: { requestId },
    });

    return ok({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "출원인을 연결하지 못했습니다.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:attach-request",
      targetIds: [applicantId],
      metadata: { requestId },
      message,
    });
    return ok({ error: message }, { status: 500 });
  }
}
