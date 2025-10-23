import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@/lib/supabaseServerClient";
import {
  ApplicantDTO,
  ApplicantRow,
  buildInsertPayload,
  handlePostgrestError,
  listApplicants,
  logAuditFailure,
  logAuditSuccess,
  toApplicantDto,
} from "@/server/db/applicants";

function parseBoolean(value: string | null, fallback = false): boolean {
  if (value === null) return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
}

function parseSort(value: string | null): "recent" | "name" {
  return value === "name" ? "name" : "recent";
}

function parseLimit(value: string | null): number {
  if (!value) return 50;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num <= 0) {
    return 50;
  }
  return num;
}

type CreateApplicantBody = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  address?: unknown;
  businessType?: unknown;
  businessNumber?: unknown;
  isFavorite?: unknown;
  metadata?: unknown;
};

function parseCreateBody(body: CreateApplicantBody) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name) {
    throw new Error("출원인 이름은 필수입니다.");
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("유효한 이메일을 입력해 주세요.");
  }
  const phone = typeof body.phone === "string" ? body.phone : null;
  if (phone && /[^0-9\s+\-.]/.test(phone)) {
    throw new Error("연락처는 숫자와 -, ., 공백만 사용할 수 있습니다.");
  }
  const address = typeof body.address === "string" ? body.address : null;
  const businessType = typeof body.businessType === "string" ? body.businessType : null;
  const businessNumber = typeof body.businessNumber === "string" ? body.businessNumber : null;
  if (businessNumber && /[^0-9\s-]/.test(businessNumber)) {
    throw new Error("사업자번호는 숫자와 - 만 사용할 수 있습니다.");
  }
  const isFavorite = typeof body.isFavorite === "boolean" ? body.isFavorite : Boolean(body.isFavorite);
  const metadata = typeof body.metadata === "object" && body.metadata !== null ? (body.metadata as Record<string, unknown>) : {};
  return {
    name,
    email,
    phone,
    address,
    businessType,
    businessNumber,
    isFavorite,
    metadata,
  };
}

function okResponse(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return okResponse({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    return okResponse({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const favoritesOnly = parseBoolean(searchParams.get("favoritesOnly"));
  const limit = parseLimit(searchParams.get("limit"));
  const sort = parseSort(searchParams.get("sort"));
  const search = searchParams.get("search");

  try {
    const items = await listApplicants(supabase, user.id, {
      favoritesOnly,
      limit,
      search,
      sort,
    });
    logAuditSuccess({
      userId: user.id,
      operation: "applicant:list",
      targetIds: items.map((item: ApplicantDTO) => item.id),
    });
    return okResponse({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "목록을 불러오지 못했습니다.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:list",
      targetIds: [],
      message,
    });
    return okResponse({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return okResponse({ error: userError.message }, { status: 500 });
  }

  if (!user) {
    return okResponse({ error: "인증이 필요합니다." }, { status: 401 });
  }

  let payload: ReturnType<typeof parseCreateBody>;

  try {
    const json = (await request.json()) as CreateApplicantBody;
    payload = parseCreateBody(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청 본문을 확인해 주세요.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:create",
      targetIds: [],
      message,
    });
    return okResponse({ error: message }, { status: 400 });
  }

  try {
    const insertPayload = buildInsertPayload(user.id, payload);
    const { data, error } = await supabase
      .from("applicants")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      throw handlePostgrestError(error);
    }

    const responseItem = toApplicantDto(data as ApplicantRow);

    logAuditSuccess({
      userId: user.id,
      operation: "applicant:create",
      targetIds: [responseItem.id],
    });

    return okResponse(responseItem, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "출원인을 생성하지 못했습니다.";
    logAuditFailure({
      userId: user.id,
      operation: "applicant:create",
      targetIds: [],
      message,
    });
    return okResponse({ error: message }, { status: 500 });
  }
}
