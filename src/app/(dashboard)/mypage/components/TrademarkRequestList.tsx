"use client";

import { useCallback } from "react";
import Link from "next/link";

import type { TrademarkRequest } from "../types";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value ?? "-";
  }
}

const STATUS_META: Record<
  string,
  {
    badge: string;
    dot: string;
    label?: string;
    description?: string;
  }
> = {
  draft: {
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
    label: "임시 저장",
    description: "제출 전 임시 저장 상태입니다.",
  },
  awaiting_payment: {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    label: "입금 대기",
    description: "가상계좌 입금을 기다리고 있습니다.",
  },
  payment_received: {
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    label: "입금 완료",
    description: "입금이 확인되었습니다.",
  },
  preparing_filing: {
    badge: "bg-indigo-100 text-indigo-700",
    dot: "bg-indigo-500",
    label: "출원 준비 중",
    description: "출원 서류를 준비하고 있습니다.",
  },
  filed: {
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
    label: "출원 완료",
    description: "특허청에 출원되었습니다.",
  },
  office_action: {
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    label: "보정/의견 제출",
    description: "특허청 답변을 준비 중입니다.",
  },
  rejected: {
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    label: "거절",
    description: "출원 과정이 중단되었습니다.",
  },
  completed: {
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    label: "등록 완료",
    description: "등록이 최종 완료되었습니다.",
  },
  cancelled: {
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
    label: "취소됨",
    description: "사용자가 요청을 취소했습니다.",
  },
  default: {
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
  },
};

type TrademarkRequestListProps = {
  requests: TrademarkRequest[];
  error?: string | null;
  isMutating?: boolean;
  onRefresh?: () => Promise<unknown> | void;
  onStatusChange?: (requestId: string, nextStatus: string) => Promise<unknown> | void;
};

function resolveStatusMeta(request: TrademarkRequest) {
  const fallback = STATUS_META.default;
  if (request.statusBadgeClass) {
    return {
      badge: request.statusBadgeClass,
      dot: request.statusDotClass ?? fallback.dot,
      label: request.statusLabel ?? request.status,
      description: request.statusDescription ?? fallback.description,
    };
  }

  const meta = STATUS_META[request.status] ?? fallback;
  return {
    badge: meta.badge,
    dot: meta.dot,
    label: request.statusLabel ?? meta.label ?? request.status,
    description: request.statusDescription ?? meta.description ?? undefined,
  };
}

function buildCtas(request: TrademarkRequest) {
  const applicantHref = `/mypage/requests/${request.id}/applicant`;
  const detailHref = `/mypage/requests/${request.id}`;

  switch (request.status) {
    case "awaiting_payment":
      return [
        { type: "link" as const, href: detailHref, label: "입금하기", variant: "primary" },
        { type: "link" as const, href: applicantHref, label: "출원인 정보 입력/수정", variant: "outline" },
        { type: "action" as const, label: "입금 완료 처리", nextStatus: "payment_received", variant: "ghost" },
      ];
    case "payment_received":
      return [
        { type: "link" as const, href: applicantHref, label: "출원인 정보 수정", variant: "outline" },
      ];
    case "preparing_filing":
      return [
        { type: "link" as const, href: applicantHref, label: "출원인 정보 입력/수정", variant: "outline" },
      ];
    default:
      return [];
  }
}

export function TrademarkRequestList({
  requests,
  error,
  isMutating,
  onRefresh,
  onStatusChange,
}: TrademarkRequestListProps) {
  const handleRefresh = useCallback(async () => {
    try {
      await onRefresh?.();
    } catch (err) {
      console.error("Failed to refresh trademark requests", err);
    }
  }, [onRefresh]);

  const handleStatusChange = useCallback(
    async (requestId: string, nextStatus: string) => {
      try {
        await onStatusChange?.(requestId, nextStatus);
      } catch (err) {
        console.error("Failed to update trademark request status", err);
      }
    },
    [onStatusChange]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">출원 요청 목록</h3>
          <p className="text-sm text-slate-600">
            상태를 빠르게 확인하고 필요한 작업을 바로 진행하세요.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isMutating}
          className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isMutating ? "새로고침 중..." : "목록 새로고침"}
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
          아직 등록된 상표 출원 요청이 없습니다. 첫 요청을 생성하면 진행 상황이 이곳에 표시됩니다.
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const meta = resolveStatusMeta(request);
            const actions = buildCtas(request);

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${meta.badge}`}
                      >
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} aria-hidden />
                        {meta.label ?? request.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        마지막 업데이트 {formatDateTime(request.lastUpdated)}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">{request.brandName}</h4>
                    {meta.description ? (
                      <p className="text-sm text-slate-600">{meta.description}</p>
                    ) : null}
                    {request.statusDescription && request.statusDescription !== meta.description ? (
                      <p className="text-sm text-slate-600">{request.statusDescription}</p>
                    ) : null}
                    <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <div className="flex gap-2">
                        <dt className="font-medium text-slate-500">신청 클래스</dt>
                        <dd className="text-slate-700">
                          {request.classes.length ? request.classes.join(", ") : "-"}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="font-medium text-slate-500">담당 변리사</dt>
                        <dd className="text-slate-700">{request.representative ?? "-"}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="font-medium text-slate-500">접수일</dt>
                        <dd className="text-slate-700">{formatDateTime(request.submittedAt)}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="font-medium text-slate-500">관리코드</dt>
                        <dd className="text-slate-700">{request.referenceCode ?? "-"}</dd>
                      </div>
                    </dl>

                    {request.transitions.length ? (
                      <div className="rounded-xl bg-slate-50 p-4">
                        <h5 className="text-sm font-semibold text-slate-700">최근 상태 이력</h5>
                        <ol className="mt-2 space-y-2 text-sm text-slate-600">
                          {request.transitions.map((transition, index) => (
                            <li key={`${transition.status}-${index}`} className="flex flex-col gap-0.5">
                              <span className="font-medium text-slate-700">
                                {transition.label ?? transition.status}
                              </span>
                              {transition.description ? <span>{transition.description}</span> : null}
                              {transition.changedAt ? (
                                <span className="text-xs text-slate-500">{formatDateTime(transition.changedAt)}</span>
                              ) : null}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2">
                    {actions.map((action) => {
                      if (action.type === "link") {
                        const variantClass =
                          action.variant === "primary"
                            ? "bg-slate-900 text-white hover:bg-slate-700"
                            : action.variant === "outline"
                              ? "border border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                              : "text-slate-600 hover:text-slate-900";
                        return (
                          <Link
                            key={`${request.id}-${action.label}`}
                            href={action.href}
                            className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${variantClass}`}
                          >
                            {action.label}
                          </Link>
                        );
                      }

                      return (
                        <button
                          key={`${request.id}-${action.label}`}
                          type="button"
                          disabled={isMutating}
                          onClick={() => handleStatusChange(request.id, action.nextStatus)}
                          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {action.label}
                        </button>
                      );
                    })}
                    <Link
                      href={`/mypage/requests/${request.id}`}
                      className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                    >
                      상세 보기
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
