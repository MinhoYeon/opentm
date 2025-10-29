import AdminTrademarkDashboardClient from "./AdminTrademarkDashboardClient";
import {
  type AdminActivityLog,
  type AdminDashboardFilters,
  type AdminTrademarkApplication,
  type AdminTrademarkRequest,
  type SavedFilter,
  type StatusSummary,
  type AdminUserSummary,
  type UnifiedTrademarkItem,
} from "./types";
import { normalizeTrademarkApplication } from "./utils/normalizeTrademarkApplication";
import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import { TRADEMARK_STATUSES, isTrademarkStatus, type TrademarkStatus } from "@/lib/trademarks/status";

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function toArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

function toPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseSavedFilter(value: unknown): AdminDashboardFilters | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const statuses = Array.isArray(record.statuses)
    ? record.statuses.filter((item): item is string => typeof item === "string")
    : [];
  const paymentStates = Array.isArray(record.paymentStates)
    ? record.paymentStates.filter((item): item is string => typeof item === "string")
    : [];
  const tags = Array.isArray(record.tags)
    ? record.tags.filter((item): item is string => typeof item === "string")
    : [];
  const search = typeof record.search === "string" ? record.search : undefined;
  const assignedTo = typeof record.assignedTo === "string" ? record.assignedTo : undefined;

  let dateRange: AdminDashboardFilters["dateRange"] = null;
  if (record.dateRange && typeof record.dateRange === "object") {
    const dr = record.dateRange as Record<string, unknown>;
    const field = typeof dr.field === "string" ? dr.field : "created_at";
    dateRange = {
      field: field as NonNullable<AdminDashboardFilters["dateRange"]>["field"],
      from: typeof dr.from === "string" ? dr.from : undefined,
      to: typeof dr.to === "string" ? dr.to : undefined,
    };
  }

  return {
    statuses,
    paymentStates,
    tags,
    search,
    assignedTo,
    dateRange,
  };
}

export function resolveStatusOptions(statuses: readonly string[] = TRADEMARK_STATUSES) {
  const LABELS: Record<string, string> = {
    draft: "임시",
    awaiting_payment: "입금 대기",
    payment_received: "입금 완료",
    awaiting_documents: "자료 보완",
    preparing_filing: "출원 준비",
    awaiting_client_signature: "서명 대기",
    filed: "출원 완료",
    office_action: "보정 진행",
    awaiting_client_response: "의견서 대기",
    awaiting_registration_fee: "등록료 납부",
    rejected: "거절",
    completed: "등록 완료",
    cancelled: "취소",
  };
  return statuses.map((status) => ({
    value: status,
    label: LABELS[status] ?? status,
  }));
}

function extractSavedFilters(source: unknown): SavedFilter[] {
  if (!Array.isArray(source)) {
    return [];
  }
  return source
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : `filter-${index}`;
      const name = typeof record.name === "string" ? record.name : `필터 ${index + 1}`;
      const filters = parseSavedFilter(record.filters);
      if (!filters) {
        return null;
      }
      return {
        id,
        name,
        description: typeof record.description === "string" ? record.description : null,
        filters,
      } satisfies SavedFilter;
    })
    .filter((item): item is SavedFilter => Boolean(item));
}

type PageSearchParams = Record<string, string | string[] | undefined>;

type PageProps = {
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

export default async function AdminTrademarksPage({ searchParams }: PageProps) {
  const { context: adminContext, session } = await requireAdminContext();
  const supabase = createAdminClient();

  const sp = isPromise<PageSearchParams>(searchParams)
    ? await searchParams
    : ((searchParams as PageSearchParams | undefined) ?? {});

  const page = toPositiveInteger(typeof sp.page === "string" ? sp.page : Array.isArray(sp.page) ? sp.page[0] : undefined, 1);
  const pageSize = 25;
  const offset = (page - 1) * pageSize;
  const limit = offset + pageSize - 1;

  const statusTokens = toArray(sp.status ?? sp.statuses);
  const statuses = statusTokens
    .flatMap((token) => token.split(/[;,]/).map((part) => part.trim()).filter(Boolean))
    .filter(isTrademarkStatus);

  const search = typeof sp.search === "string" ? sp.search.trim() : undefined;
  const assignedTo = typeof sp.assignedTo === "string" ? sp.assignedTo.trim() : undefined;
  const initialFilters: AdminDashboardFilters = {
    statuses,
    paymentStates: [],
    tags: [],
    search,
    assignedTo,
    dateRange: null,
  };

  // 통합 뷰: trademark_requests를 기준으로 데이터 로드
  let requestsQuery = supabase
    .from("trademark_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, limit);

  if (search) {
    const like = `%${search.replace(/%/g, "").replace(/_/g, "")}%`;
    requestsQuery = requestsQuery.or(`brand_name.ilike.${like},representative_email.ilike.${like}`);
  }

  const { data: requestsRows, count: requestsCount, error: requestsError } = await requestsQuery;

  if (requestsError) {
    console.error("Failed to fetch trademark requests:", requestsError);
    throw requestsError;
  }

  console.log(`Loaded ${requestsRows?.length ?? 0} trademark requests (total: ${requestsCount ?? 0})`);

  const requests: AdminTrademarkRequest[] = (requestsRows ?? []) as AdminTrademarkRequest[];

  // trademark_applications 로드 (request_id로 매핑하기 위해)
  const { data: applicationsRows, error: applicationsError } = await supabase
    .from("trademark_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (applicationsError) {
    console.error("Failed to fetch trademark applications:", applicationsError);
  }

  const applications: AdminTrademarkApplication[] = (applicationsRows ?? []).map((row) =>
    normalizeTrademarkApplication(row as Record<string, unknown>)
  );

  // request_id를 키로 하는 맵 생성
  const applicationsByRequestId = new Map<string, AdminTrademarkApplication>();
  applications.forEach((app) => {
    const requestId = app.metadata?.request_id as string | undefined;
    if (requestId) {
      applicationsByRequestId.set(requestId, app);
    }
  });

  // 통합 아이템 생성
  const unifiedItems: UnifiedTrademarkItem[] = requests.map((request) => {
    const application = applicationsByRequestId.get(request.id) || null;
    return {
      request,
      application,
      isApproved: application !== null,
    };
  });

  // 상태 요약은 이제 requests의 상태 기준으로 생성
  const statusSummary: StatusSummary[] = [];
  const statusCounts = new Map<string, number>();
  requests.forEach((request) => {
    const status = request.status === "submitted" ? "awaiting_payment" : (request.status as TrademarkStatus);
    statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
  });
  for (const [status, count] of statusCounts) {
    statusSummary.push({ status: status as StatusSummary["status"], count });
  }

  let recentActivity: AdminActivityLog[] = [];
  try {
    const { data: activityRows } = await supabase
      .from("admin_activity_logs")
      .select("id, action_type, target_type, target_id, metadata, created_at, summary")
      .order("created_at", { ascending: false })
      .limit(10);
    recentActivity = (activityRows ?? []).map((row, index) => ({
      id: String(row.id ?? index),
      actionType: typeof row.action_type === "string" ? row.action_type : "unknown",
      targetType: typeof row.target_type === "string" ? row.target_type : null,
      targetId: typeof row.target_id === "string" ? row.target_id : null,
      summary:
        typeof row.summary === "string"
          ? row.summary
          : typeof row.action_type === "string"
          ? row.action_type
          : "관리자 활동",
      createdAt: typeof row.created_at === "string" ? row.created_at : null,
      actorId: null,
      actorName: null,
      metadata: row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : null,
    }));
  } catch (activityError) {
    console.warn("Failed to load admin activity logs", activityError);
  }

  const savedFilterSource =
    (session.user.user_metadata?.admin_saved_filters as unknown) ??
    (session.user.user_metadata?.saved_filters as unknown);
  const savedFilters = extractSavedFilters(savedFilterSource);

  const totalCount = typeof requestsCount === "number" ? requestsCount : requests.length;

  const statusOptions = resolveStatusOptions();

  const adminUser: AdminUserSummary = {
    id: session.user.id,
    email: session.user.email ?? null,
    name:
      (typeof session.user.user_metadata?.name === "string" && session.user.user_metadata.name) ||
      (typeof session.user.user_metadata?.full_name === "string" && session.user.user_metadata.full_name) ||
      session.user.email ?? null,
    role: adminContext.role,
    capabilities: adminContext.capabilities,
  };

  return (
    <AdminTrademarkDashboardClient
      admin={adminUser}
      initialUnifiedItems={unifiedItems}
      initialPagination={{ page, pageSize, totalCount }}
      initialStatusSummary={statusSummary}
      initialFilters={initialFilters}
      statusOptions={statusOptions}
      recentActivity={recentActivity}
      savedFilters={savedFilters}
    />
  );
}

