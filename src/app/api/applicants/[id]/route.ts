import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabaseServerClient";
import type { ApplicantPayload } from "@/server/db/applicants";
import {
  ApplicantRow,
  buildUpdatePayload,
  handlePostgrestError,
  logAuditFailure,
  logAuditSuccess,
  toApplicantDto,
} from "@/server/db/applicants";

function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

type UpdateBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  businessType?: unknown;
  businessNumber?: unknown;
  isFavorite?: unknown;
  metadata?: unknown;
  markAsUsed?: unknown;
};

function parseUpdateBody(body: UpdateBody): Partial<ApplicantPayload> & { markAsUsed?: boolean } {
  const payload: Partial<ApplicantPayload> & { markAsUsed?: boolean } = {};

  if (typeof body.name === "string") {
    payload.name = body.name;
  }
  if (typeof body.email === "string") {
    payload.email = body.email;
  }
  if ("phone" in body) {
    payload.phone = typeof body.phone === "string" ? body.phone : null;
    if (payload.phone && /[^0-9\s+\-.]/.test(payload.phone)) {
      throw new Error("연락처는 숫자와 -, ., 공백만 사용할 수 있습니다.");
    }
  }
  if ("address" in body) {
    payload.address = typeof body.address === "string" ? body.address : null;
  }
  if ("businessType" in body) {
    payload.businessType = typeof body.businessType === "string" ? body.businessType : null;
  }
  if ("businessNumber" in body) {
    payload.businessNumber = typeof body.businessNumber === "string" ? body.businessNumber : null;
    if (payload.businessNumber && /[^0-9\s-]/.test(payload.businessNumber)) {
      throw new Error("사업자번호는 숫자와 - 만 사용할 수 있습니다.");
    }
  }
  if ("isFavorite" in body) {
    payload.isFavorite = typeof body.isFavorite === "boolean" ? body.isFavorite : Boolean(body.isFavorite);
  }
  if (typeof body.metadata === "object" && body.metadata !== null) {
    payload.metadata = body.metadata as Record<string, unknown>;
  }
  if (typeof body.markAsUsed === "boolean") {
    payload.markAsUsed = body.markAsUsed;
  }

  if (!Object.keys(payload).length) {
    throw new Error("업데이트할 필드를 제공해 주세요.");
  }

  return payload;
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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

  const applicantId = params.id;

  let body: ReturnType<typeof parseUpdateBody>;
  try {
    const json = (await request.json()) as UpdateBody;
    body = parseUpdateBody(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 본문을 확인해 주세요.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:update",
      targetIds: [applicantId],
      message,
    });
    return ok({ error: message }, { status: 400 });
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from("applicants")
      .select("*")
      .eq("id", applicantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      throw handlePostgrestError(existingError);
    }

    if (!existing) {
      return ok({ error: "출원인을 찾을 수 없습니다." }, { status: 404 });
    }

    const updatePayload = buildUpdatePayload(body);
    if (!Object.keys(updatePayload).length) {
      return ok({ error: "변경 사항이 없습니다." }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("applicants")
      .update(updatePayload)
      .eq("id", applicantId)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      throw handlePostgrestError(error);
    }

    const item = toApplicantDto(data as ApplicantRow);

    logAuditSuccess({
      userId: user.id,
      operation: "applicant:update",
      targetIds: [applicantId],
    });

    return ok(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "출원인을 수정하지 못했습니다.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:update",
      targetIds: [applicantId],
      message,
    });
    return ok({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
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

  const applicantId = params.id;

  try {
    const { data: existing, error: existingError } = await supabase
      .from("applicants")
      .select("id")
      .eq("id", applicantId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) {
      throw handlePostgrestError(existingError);
    }

    if (!existing) {
      return ok({ error: "출원인을 찾을 수 없습니다." }, { status: 404 });
    }

    const { error } = await supabase
      .from("applicants")
      .delete()
      .eq("id", applicantId)
      .eq("user_id", user.id);

    if (error) {
      throw handlePostgrestError(error);
    }

    logAuditSuccess({
      userId: user.id,
      operation: "applicant:delete",
      targetIds: [applicantId],
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "출원인을 삭제하지 못했습니다.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:delete",
      targetIds: [applicantId],
      message,
    });
    return ok({ error: message }, { status: 500 });
  }
}
