import { redirect } from "next/navigation";

import MyPageClient from "./MyPageClient";
import type { ApplicantSummary, TrademarkRequest, UserDashboardStats } from "./types";
import { normalizeTrademarkRequest } from "./utils/normalizeTrademarkRequest";
import { createServerClient } from "@/lib/supabaseServerClient";
import { listApplicants } from "@/server/db/applicants";
import type { User as SupabaseUser } from "@supabase/supabase-js";

type PageSearchParams = {
  page?: string;
};

type PageProps = {
  // Next 15: dynamic APIs like searchParams are async
  searchParams?: Promise<PageSearchParams> | PageSearchParams;
};

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

export function toPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getPaginationRange(page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 1;
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  return { from, to };
}

function resolveDisplayName(user: SupabaseUser) {
  if (user.user_metadata) {
    const { name, full_name: fullName } = user.user_metadata as Record<string, unknown>;
    if (typeof name === "string" && name.trim()) {
      return name.trim();
    }
    if (typeof fullName === "string" && fullName.trim()) {
      return fullName.trim();
    }
  }
  return user.email ?? null;
}

export default async function MyPage({ searchParams }: PageProps) {
  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser();

  console.log("[MyPage] Server component - getUser result:", {
    hasUser: !!data?.user,
    userId: data?.user?.id,
    error: error?.message
  });

  if (error || !data?.user) {
    console.log("[MyPage] No user found, redirecting to login");
    redirect(`/login?redirect=${encodeURIComponent("/mypage")}`);
  }

  const sp = isPromise<PageSearchParams>(searchParams)
    ? await searchParams
    : ((searchParams as PageSearchParams | undefined) ?? {});
  const page = toPositiveInteger(sp.page, 1);
  const pageSize = 10;
  const { from, to } = getPaginationRange(page, pageSize);

  const { data: rows, count, error: listError } = await supabase
    .from("trademark_requests")
    .select(`
      *,
      trademark_request_applicants(
        applicant_id,
        applicants(
          name_korean,
          display_name
        )
      )
    `, { count: "exact" })
    .eq("user_id", data.user.id)
    .order("submitted_at", { ascending: false })
    .range(from, to);

  if (listError) {
    throw listError;
  }

  const submissions: TrademarkRequest[] = (rows ?? []).map((item) => {
    const row = item as Record<string, unknown>;
    // Extract all applicant names from joined data
    let applicantName: string | null = null;
    if (Array.isArray(row.trademark_request_applicants) && row.trademark_request_applicants.length > 0) {
      const applicantNames = row.trademark_request_applicants
        .map((applicantItem) => {
          const applicantRecord = applicantItem as Record<string, unknown>;
          if (applicantRecord && typeof applicantRecord.applicants === "object" && applicantRecord.applicants !== null) {
            const applicantData = applicantRecord.applicants as Record<string, unknown>;
            return (
              (typeof applicantData.name_korean === "string" ? applicantData.name_korean : null) ||
              (typeof applicantData.display_name === "string" ? applicantData.display_name : null)
            );
          }
          return null;
        })
        .filter((name): name is string => name !== null);

      applicantName = applicantNames.length > 0 ? applicantNames.join(", ") : null;
    }

    // Debug: Log image_url for troubleshooting
    if (row.image_url) {
      console.log("[MyPage] Trademark with image:", {
        id: row.id,
        brand_name: row.brand_name,
        image_url: row.image_url,
      });
    }

    return normalizeTrademarkRequest({ ...row, applicant_name: applicantName });
  });

  const totalCount = Number.isFinite(count) && typeof count === "number" ? count : submissions.length;

  const displayName = resolveDisplayName(data.user);

  const processSteps = [
    "신청접수(입금대기)",
    "결제완료",
    "출원인정보입력대기",
    "출원완료",
    "심사중(약1년2개월)",
    "출원공고",
    "등록료대기",
    "등록완료",
  ];

  // Fetch all applicants for the user
  let applicants: Array<{ id: string; name: string; email: string }> = [];
  try {
    const allApplicants = await listApplicants(supabase, data.user.id, {
      limit: 50,
      sort: "recent",
    });
    applicants = allApplicants.map((app) => ({
      id: app.id,
      name: app.nameKorean || app.name || "-",
      email: app.email,
    }));
  } catch {
    applicants = [];
  }

  // Keep legacy applicant for backward compatibility (most recent from trademark_request_applicants)
  let applicant: ApplicantSummary | null = null;
  try {
    const { data: applicantRows } = await supabase
      .from("trademark_request_applicants")
      .select("*")
      .eq("user_id", data.user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (applicantRows && applicantRows.length > 0) {
      const a = applicantRows[0] as Record<string, unknown>;
      applicant = {
        name: typeof a.name === "string" ? a.name : null,
        email: typeof a.email === "string" ? a.email : null,
        phone: typeof a.phone === "string" ? a.phone : null,
        address: typeof a.address === "string" ? a.address : null,
        businessType: typeof a.business_type === "string" ? (a.business_type as string) : null,
        businessNo: typeof a.business_no === "string" ? (a.business_no as string) : null,
        requestId: typeof a.request_id === "string" ? (a.request_id as string) : null,
      };
    }
  } catch {
    applicant = null;
  }

  const userInfo = {
    id: data.user.id,
    email: data.user.email ?? null,
    name: displayName,
  };

  // 사용자 대시보드 통계 계산
  const stats: UserDashboardStats = {
    totalRequests: submissions.length,
    inProgress: submissions.filter((s) =>
      !["completed", "registered", "rejected", "cancelled"].includes(s.status)
    ).length,
    completed: submissions.filter((s) =>
      ["completed", "registered"].includes(s.status)
    ).length,
    pendingActions: submissions.filter((s) =>
      ["awaiting_documents", "awaiting_client_signature", "awaiting_client_response"].includes(s.status)
    ).length,
    awaitingPayment: submissions.filter((s) =>
      ["awaiting_payment", "awaiting_registration_fee"].includes(s.status)
    ).length,
  };

  return (
    <MyPageClient
      user={userInfo}
      submissions={submissions}
      pagination={{ page, pageSize, totalCount }}
      processSteps={processSteps}
      applicant={applicant}
      applicants={applicants}
      stats={stats}
    />
  );
}
