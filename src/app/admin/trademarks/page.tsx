import AdminTrademarkDashboardClient from "./AdminTrademarkDashboardClient";
import {
  type AdminActivityLog,
  type AdminDashboardFilters,
  type AdminTrademarkRequest,
  type SavedFilter,
  type StatusSummary,
  type AdminUserSummary,
  type DashboardStats,
} from "./types";
import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import { TRADEMARK_STATUSES, isTrademarkStatus, type TrademarkStatus } from "@/lib/trademarks/status";
import { STATUS_METADATA } from "@/lib/status";

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
  return statuses.map((status) => {
    const metadata = STATUS_METADATA[status as TrademarkStatus];
    return {
      value: status,
      label: metadata?.label ?? status,
      description: metadata?.helpText,
    };
  });
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

  // trademark_requests에서 통합된 데이터 로드
  let trademarksQuery = supabase
    .from("trademark_requests")
    .select("*", { count: "exact" })
    .order("submitted_at", { ascending: false })
    .range(offset, limit);

  if (search) {
    const like = `%${search.replace(/%/g, "").replace(/_/g, "")}%`;
    trademarksQuery = trademarksQuery.or(`brand_name.ilike.${like},representative_email.ilike.${like},applicant_name.ilike.${like},applicant_email.ilike.${like}`);
  }

  if (statuses.length > 0) {
    trademarksQuery = trademarksQuery.in("status", statuses);
  }

  const { data: trademarksRows, count: trademarksCount, error: trademarksError } = await trademarksQuery;

  if (trademarksError) {
    console.error("Failed to fetch trademarks:", trademarksError);
    throw trademarksError;
  }

  console.log(`Loaded ${trademarksRows?.length ?? 0} trademarks (total: ${trademarksCount ?? 0})`);

  const trademarks: AdminTrademarkRequest[] = (trademarksRows ?? []) as AdminTrademarkRequest[];

  // 사용자 정보 조회 (user_id로) - applicant_name/email이 없는 경우에만
  const userIds = [...new Set(trademarks
    .filter(t => t.user_id && !t.applicant_name && !t.applicant_email)
    .map(t => t.user_id)
    .filter((id): id is string => Boolean(id)))];

  const usersMap = new Map<string, { name: string | null; email: string | null }>();

  if (userIds.length > 0) {
    const { data: usersData } = await supabase.auth.admin.listUsers();
    if (usersData?.users) {
      usersData.users.forEach(user => {
        if (user.id) {
          usersMap.set(user.id, {
            name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            email: user.email || null,
          });
        }
      });
    }
  }

  // trademarks에 사용자 정보 매핑 (applicant_name/email이 없는 경우)
  trademarks.forEach(trademark => {
    if (trademark.user_id && usersMap.has(trademark.user_id)) {
      const userData = usersMap.get(trademark.user_id)!;
      if (!trademark.applicant_name) {
        trademark.applicant_name = userData.name;
      }
      if (!trademark.applicant_email) {
        trademark.applicant_email = userData.email;
      }
    }
    // trademark_image_url은 image_url로 매핑
    trademark.trademark_image_url = trademark.image_url;
  });

  // 상태 요약 생성
  const statusSummary: StatusSummary[] = [];
  const statusCounts = new Map<string, number>();
  trademarks.forEach((trademark) => {
    const status = trademark.status as TrademarkStatus;
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

  const totalCount = typeof trademarksCount === "number" ? trademarksCount : trademarks.length;

  const statusOptions = resolveStatusOptions();

  // 결제 통계 계산
  let dashboardStats: DashboardStats = {
    totalRequests: totalCount,
    pendingApproval: trademarks.filter((t) => t.status === "submitted").length,
    approved: trademarks.filter((t) => t.status !== "submitted").length,
    payments: {
      totalAmount: 0,
      totalPaid: 0,
      totalUnpaid: 0,
      overdueCount: 0,
      refundRequestedCount: 0,
    },
  };

  try {
    const { data: paymentsRows } = await supabase
      .from("trademark_payments")
      .select("payment_status, amount, paid_amount, due_at");

    if (paymentsRows && paymentsRows.length > 0) {
      let totalAmount = 0;
      let totalPaid = 0;
      let totalUnpaid = 0;
      let overdueCount = 0;
      let refundRequestedCount = 0;

      const now = new Date();

      for (const payment of paymentsRows) {
        const amount = typeof payment.amount === "number" ? payment.amount : 0;
        const paidAmount = typeof payment.paid_amount === "number" ? payment.paid_amount : 0;
        const status = payment.payment_status as string;
        const dueAt = payment.due_at ? new Date(payment.due_at as string) : null;

        totalAmount += amount;
        totalPaid += paidAmount;

        if (status === "paid") {
          // 완납된 경우
        } else if (status === "refund_requested" || status === "refunded") {
          refundRequestedCount += 1;
        } else {
          // 미납 금액 계산
          const unpaidAmount = amount - paidAmount;
          if (unpaidAmount > 0) {
            totalUnpaid += unpaidAmount;
          }

          // 연체 확인
          if (status === "overdue" || (dueAt && dueAt < now && status !== "paid")) {
            overdueCount += 1;
          }
        }
      }

      dashboardStats.payments = {
        totalAmount,
        totalPaid,
        totalUnpaid,
        overdueCount,
        refundRequestedCount,
      };
    }
  } catch (paymentsError) {
    console.warn("Failed to load payment statistics", paymentsError);
  }

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
      initialTrademarks={trademarks}
      initialPagination={{ page, pageSize, totalCount }}
      initialStatusSummary={statusSummary}
      initialFilters={initialFilters}
      statusOptions={statusOptions}
      recentActivity={recentActivity}
      savedFilters={savedFilters}
      dashboardStats={dashboardStats}
    />
  );
}

