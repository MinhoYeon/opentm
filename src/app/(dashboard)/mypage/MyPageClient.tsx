"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  ApplicantSummary,
  AuthenticatedUser,
  PaginationInfo,
  TrademarkRequest,
  UserDashboardStats,
} from "./types";
import type { ApplicantDTO } from "@/server/db/applicants";
import { StatusFilter } from "./components/StatusFilter";
import { TrademarkRequestList } from "./components/TrademarkRequestList";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useTrademarkRequests } from "./hooks/useTrademarkRequests";
import { MyPageApplicantCard } from "@/components/mypage/MyPageApplicantCard";

type TabType = "requests" | "applicants" | "profile";

type MyPageClientProps = {
  user: AuthenticatedUser;
  submissions: TrademarkRequest[];
  pagination: PaginationInfo;
  processSteps: string[];
  applicant: ApplicantSummary | null;
  applicants: ApplicantDTO[];
  stats: UserDashboardStats;
};

function createPageHref(page: number) {
  const params = new URLSearchParams();
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/mypage?${query}` : "/mypage";
}

export default function MyPageClient({
  user,
  submissions,
  pagination,
  processSteps,
  applicants: initialApplicants,
}: MyPageClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [managementNumberSearch, setManagementNumberSearch] = useState("");
  const [applicantNameSearch, setApplicantNameSearch] = useState("");
  const [applicants, setApplicants] = useState<ApplicantDTO[]>(initialApplicants);
  const [isDeleting, setIsDeleting] = useState(false);
  const debouncedSearch = useDebouncedValue(searchTerm, 350);
  const debouncedManagementNumber = useDebouncedValue(managementNumberSearch, 350);
  const debouncedApplicantName = useDebouncedValue(applicantNameSearch, 350);

  const { requests, refresh, updateStatus, isMutating, isLoading, error } = useTrademarkRequests({
    initialRequests: submissions,
    userId: user.id,
    statusFilter,
    searchTerm: debouncedSearch,
    managementNumberSearch: debouncedManagementNumber,
    applicantNameSearch: debouncedApplicantName,
  });

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (err) {
      console.error("Failed to refresh trademark requests", err);
    }
  }, [refresh]);

  const handleEditApplicant = useCallback((id: string) => {
    router.push(`/mypage/applicants/${id}`);
  }, [router]);

  const handleDeleteApplicant = useCallback(async (id: string) => {
    const applicant = applicants.find(app => app.id === id);
    if (!applicant) return;

    const confirmMessage = `"${applicant.nameKorean || applicant.name}" 출원인을 삭제하시겠습니까?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/applicants/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "출원인을 삭제하지 못했습니다.");
      }

      // Remove the deleted applicant from the list
      setApplicants(prev => prev.filter(app => app.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "출원인을 삭제하지 못했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }, [applicants]);

  const computedTotal = Math.max(pagination.totalCount, submissions.length, requests.length);
  const totalPages = Math.max(Math.ceil(computedTotal / pagination.pageSize), 1);
  const hasPreviousPage = pagination.page > 1;
  const hasNextPage = pagination.page < totalPages;
  const userName = user.name?.trim() || user.email?.trim() || "사용자";
  const userEmail = user.email ?? "-";

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">마이페이지</h1>
      </header>

      {/* 탭 메뉴 */}
      <nav className="flex gap-2 border-b border-slate-200" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "requests"}
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
            activeTab === "requests"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          상표 출원 요청
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "applicants"}
          onClick={() => setActiveTab("applicants")}
          className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
            activeTab === "applicants"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          출원인 정보
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "profile"}
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
            activeTab === "profile"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          회원정보
        </button>
      </nav>

      {/* 상표 출원 요청 탭 */}
      {activeTab === "requests" && (
        <section className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-semibold text-slate-900">상표 출원 요청</h2>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              새 출원 요청 만들기
            </Link>
          </div>

          <div className="rounded-2xl bg-indigo-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-2">출원 과정 안내</h3>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
              {processSteps.map((step, idx) => (
                <span key={`${step}-${idx}`} className="flex items-center gap-3">
                  <span>{step}</span>
                  {idx < processSteps.length - 1 ? <span className="text-slate-400">▶</span> : null}
                </span>
              ))}
            </div>
          </div>

          <StatusFilter
            value={statusFilter}
            onChange={setStatusFilter}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            managementNumberSearch={managementNumberSearch}
            onManagementNumberSearchChange={setManagementNumberSearch}
            applicantNameSearch={applicantNameSearch}
            onApplicantNameSearchChange={setApplicantNameSearch}
            isBusy={isLoading || isMutating}
            onRefresh={handleRefresh}
          />

          <TrademarkRequestList
            requests={requests}
            error={error}
            isMutating={isMutating}
            isLoading={isLoading}
            onStatusChange={updateStatus}
          />

          <div className="flex items-center justify-between rounded-full border border-slate-200 bg-white px-4 py-2 text-sm">
            <span className="text-slate-600">
              페이지 {pagination.page} / {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Link
                aria-disabled={!hasPreviousPage}
                className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition ${
                  hasPreviousPage
                    ? "text-slate-700 hover:bg-slate-100"
                    : "cursor-not-allowed text-slate-400"
                }`}
                href={hasPreviousPage ? createPageHref(pagination.page - 1) : "#"}
              >
                이전
              </Link>
              <Link
                aria-disabled={!hasNextPage}
                className={`inline-flex items-center rounded-full px-3 py-1 font-medium transition ${
                  hasNextPage ? "text-slate-700 hover:bg-slate-100" : "cursor-not-allowed text-slate-400"
                }`}
                href={hasNextPage ? createPageHref(pagination.page + 1) : "#"}
              >
                다음
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 출원인 정보 탭 */}
      {activeTab === "applicants" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">출원인 정보</h2>
            <Link
              href="/mypage/applicants/new"
              className="rounded-full border border-indigo-500 bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              새 출원인 등록
            </Link>
          </div>
          {applicants.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {applicants.map((app) => (
                <MyPageApplicantCard
                  key={app.id}
                  applicant={app}
                  onEdit={handleEditApplicant}
                  onDelete={handleDeleteApplicant}
                  disabled={isDeleting}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-center text-sm text-slate-600">
                등록된 출원인이 없습니다. &quot;새 출원인 등록&quot; 버튼을 눌러 출원인을 추가해 주세요.
              </p>
            </div>
          )}
        </section>
      )}

      {/* 회원정보 탭 */}
      {activeTab === "profile" && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">회원정보</h2>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <p className="text-base font-medium text-slate-900">{userName}</p>
              <p className="text-sm text-slate-500">{userEmail}</p>
            </div>
            <Link
              href="/mypage/profile"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              회원 정보 수정
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export type { MyPageClientProps };
