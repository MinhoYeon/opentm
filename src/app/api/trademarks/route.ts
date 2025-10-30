import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext, requireAuthenticatedSession } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import { resolveAdminContext } from "@/lib/admin/roles";
import {
  TrademarkStatus,
  isTrademarkStatus,
  resolveInitialStatus,
} from "@/lib/trademarks/status";

function parseStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const tokens = value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
    return tokens.length > 0 ? tokens : null;
  }
  if (typeof value === "string") {
    const tokens = value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter(Boolean);
    return tokens.length > 0 ? tokens : null;
  }
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDateTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function parseOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type CreateTrademarkPayload = {
  requestId?: string | null;
  brandName?: string;
  trademarkType?: string | null;
  productClasses?: string[] | null;
  goodsDescription?: string | null;
  payment?: {
    amount?: number | null;
    currency?: string | null;
    dueAt?: string | null;
    reference?: string | null;
    skipGate?: boolean | null;
  } | null;
  metadata?: Record<string, unknown> | null;
  statusDetail?: string | null;
};

type ListQuery = {
  limit: number;
  page: number;
  statuses?: TrademarkStatus[];
  managementNumber?: string;
  search?: string | null;
  managementNumberSearch?: string | null;
  customerNameSearch?: string | null;
  userId?: string;
  assignedTo?: string | null;
  dateRangeField?: "created_at" | "updated_at" | "filed_at" | "status_updated_at" | "submitted_at" | "filing_submitted_at";
  dateFrom?: string | null;
  dateTo?: string | null;
};

function parseStatuses(values: string[]): TrademarkStatus[] | undefined {
  const unique = new Set<TrademarkStatus>();

  for (const raw of values) {
    const tokens = raw
      .split(/[;,]/)
      .map((token) => token.trim())
      .filter(Boolean);

    for (const token of tokens) {
      if (isTrademarkStatus(token)) {
        unique.add(token);
      }
    }
  }

  return unique.size > 0 ? Array.from(unique) : undefined;
}

function parseListQuery(request: NextRequest, isAdmin: boolean, userId: string): ListQuery {
  const params = request.nextUrl.searchParams;
  const limit = Math.min(Number.parseInt(params.get("limit") ?? "20", 10) || 20, 100);
  const page = Math.max(Number.parseInt(params.get("page") ?? "1", 10) || 1, 1);

  const statusValues = params.getAll("status");
  if (statusValues.length === 0) {
    const statusParam = params.get("statuses");
    if (statusParam) {
      statusValues.push(statusParam);
    }
  }

  const statuses = parseStatuses(statusValues);

  const managementNumber = params.get("managementNumber") ?? undefined;
  const search = parseOptionalString(params.get("search"));
  const managementNumberSearch = parseOptionalString(params.get("managementNumberSearch"));
  const customerNameSearch = parseOptionalString(params.get("customerNameSearch"));
  const searchUserId = isAdmin ? params.get("userId") ?? undefined : userId;
  const assignedTo = parseOptionalString(params.get("assignedTo"));

  // 날짜 범위 파라미터 파싱
  const dateFields = ["created_at", "updated_at", "filed_at", "status_updated_at", "submitted_at", "filing_submitted_at"] as const;
  let dateRangeField: ListQuery["dateRangeField"] = undefined;
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  for (const field of dateFields) {
    const fromParam = params.get(`${field}From`);
    const toParam = params.get(`${field}To`);
    if (fromParam || toParam) {
      dateRangeField = field;
      dateFrom = fromParam;
      dateTo = toParam;
      break;
    }
  }

  return {
    limit,
    page,
    statuses,
    managementNumber,
    search,
    managementNumberSearch,
    customerNameSearch,
    userId: searchUserId,
    assignedTo,
    dateRangeField,
    dateFrom,
    dateTo
  };
}

function normalizeBrandName(brandName: string): string {
  return brandName.trim();
}

export async function GET(request: NextRequest) {
  let session = await requireAuthenticatedSession();
  let adminContext = resolveAdminContext(session.user);
  if (adminContext) {
    const adminResult = await requireAdminContext();
    session = adminResult.session;
    adminContext = adminResult.context;
  }

  const adminClient = createAdminClient();
  const admin = Boolean(adminContext);
  const query = parseListQuery(request, admin, session.user.id);

  console.log('🔍 [API DEBUG] Parsed query:', JSON.stringify(query, null, 2));

  let supabaseQuery = adminClient
    .from("trademark_requests")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range((query.page - 1) * query.limit, query.page * query.limit - 1);

  if (query.statuses?.length) {
    supabaseQuery = supabaseQuery.in("status", query.statuses);
  }

  if (query.managementNumber) {
    supabaseQuery = supabaseQuery.eq("management_number", query.managementNumber);
  }

  if (query.search) {
    const like = `%${query.search.replace(/%/g, "").replace(/_/g, "")}%`;
    supabaseQuery = supabaseQuery.or(
      `brand_name.ilike.${like},representative_email.ilike.${like},applicant_name.ilike.${like},applicant_email.ilike.${like},management_number.ilike.${like},additional_notes.ilike.${like}`
    );
  }

  if (query.managementNumberSearch) {
    const like = `%${query.managementNumberSearch.replace(/%/g, "").replace(/_/g, "")}%`;
    supabaseQuery = supabaseQuery.ilike("management_number", like);
  }

  if (query.customerNameSearch) {
    const like = `%${query.customerNameSearch.replace(/%/g, "").replace(/_/g, "")}%`;
    supabaseQuery = supabaseQuery.ilike("applicant_name", like);
  }

  if (!admin) {
    supabaseQuery = supabaseQuery.eq("user_id", session.user.id);
  } else if (query.userId) {
    supabaseQuery = supabaseQuery.eq("user_id", query.userId);
  }

  if (admin && query.assignedTo) {
    // UUID 형식인지 확인
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(query.assignedTo)) {
      // UUID인 경우 assigned_to로 검색
      supabaseQuery = supabaseQuery.eq("assigned_to", query.assignedTo);
    } else {
      // 이메일인 경우 assigned_to_email로 검색
      const like = `%${query.assignedTo.replace(/%/g, "").replace(/_/g, "")}%`;
      supabaseQuery = supabaseQuery.ilike("assigned_to_email", like);
    }
  }

  // 날짜 범위 필터 적용
  if (query.dateRangeField) {
    if (query.dateFrom) {
      supabaseQuery = supabaseQuery.gte(query.dateRangeField, query.dateFrom);
    }
    if (query.dateTo) {
      // 종료일에 하루를 더해서 해당 날짜를 포함하도록 함
      const toDate = new Date(query.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      supabaseQuery = supabaseQuery.lt(query.dateRangeField, toDate.toISOString().split('T')[0]);
    }
  }

  const { data, error, count } = await supabaseQuery;

  if (error) {
    console.error('❌ [API DEBUG] Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('✅ [API DEBUG] Query result:', {
    count,
    dataLength: data?.length,
    filters: {
      search: query.search,
      managementNumberSearch: query.managementNumberSearch,
      customerNameSearch: query.customerNameSearch,
      assignedTo: query.assignedTo
    }
  });

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page: query.page,
    pageSize: query.limit,
  });
}

export async function POST(request: NextRequest) {
  let session = await requireAuthenticatedSession();
  let adminContext = resolveAdminContext(session.user);
  if (adminContext) {
    const adminResult = await requireAdminContext();
    session = adminResult.session;
    adminContext = adminResult.context;
  }

  let payload: CreateTrademarkPayload;
  try {
    payload = (await request.json()) as CreateTrademarkPayload;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const brandName = normalizeBrandName(payload.brandName ?? "");
  if (!brandName) {
    return NextResponse.json({ error: "상표명을 입력해주세요." }, { status: 400 });
  }

  const productClasses = parseStringArray(payload.productClasses) ?? [];
  if (productClasses.length === 0) {
    return NextResponse.json({ error: "상품류를 최소 1개 이상 선택해주세요." }, { status: 400 });
  }

  const metadata = payload.metadata && isPlainObject(payload.metadata) ? payload.metadata : {};

  const adminClient = createAdminClient();

  if (payload.requestId) {
    const { data: requestRecord, error: requestError } = await adminClient
      .from("trademark_requests")
      .select("id,user_id")
      .eq("id", payload.requestId)
      .maybeSingle();

    if (requestError) {
      return NextResponse.json({ error: requestError.message }, { status: 500 });
    }

    if (!requestRecord) {
      return NextResponse.json({ error: "연결된 신청서를 찾을 수 없습니다." }, { status: 400 });
    }

    if (requestRecord.user_id && requestRecord.user_id !== session.user.id && !adminContext) {
      return NextResponse.json({ error: "신청서에 접근 권한이 없습니다." }, { status: 403 });
    }
  }

  const paymentAmount = parseNumber(payload.payment?.amount);
  const paymentCurrency = parseOptionalString(payload.payment?.currency);
  const paymentDueAt = parseDateTime(payload.payment?.dueAt);
  const paymentReference = parseOptionalString(payload.payment?.reference);
  const skipPaymentGate = payload.payment?.skipGate ?? false;

  const initialStatus = resolveInitialStatus({
    paymentAmount: typeof paymentAmount === "number" ? paymentAmount : null,
    skipPaymentGate: Boolean(skipPaymentGate),
  });

  const nowIso = new Date().toISOString();

  const insertPayload = {
    request_id: payload.requestId ?? null,
    user_id: session.user.id,
    brand_name: brandName,
    trademark_type: parseOptionalString(payload.trademarkType) ?? null,
    product_classes: productClasses,
    goods_description: parseOptionalString(payload.goodsDescription),
    status: initialStatus,
    status_detail: parseOptionalString(payload.statusDetail),
    status_updated_at: nowIso,
    payment_amount: paymentAmount,
    payment_currency: paymentCurrency,
    payment_due_at: paymentDueAt,
    payment_reference: paymentReference,
    payment_received_at: null, // payment_received status no longer exists
    metadata,
  } satisfies Record<string, unknown>;

  const { data, error } = await adminClient
    .from("trademark_applications")
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await adminClient.from("trademark_status_logs").insert({
    application_id: data.id,
    from_status: null,
    to_status: data.status,
    changed_by: session.user.id,
    note: "신청 생성",
    metadata: { origin: "api" },
  });

  return NextResponse.json({ application: data }, { status: 201 });
}
