"use client";

import Link from "next/link";

import { StatusTimeline } from "@/components/mypage/StatusTimeline";

import type { TrademarkRequest } from "../types";

type StatusPresentation = {
  label: string;
  helpText: string;
  badgeClass: string;
  dotClass: string;
};

const STATUS_PRESENTATION: Record<string, StatusPresentation> = {
  draft: {
    label: "임시 저장",
    helpText: "제출 전 임시 저장 상태입니다.",
    badgeClass: "bg-slate-100 text-slate-700",
    dotClass: "bg-slate-500",
  },
  awaiting_payment: {
    label: "입금 대기",
    helpText: "가상계좌 입금이 확인되면 다음 단계로 진행됩니다.",
    badgeClass: "bg-amber-100 text-amber-700",
    dotClass: "bg-amber-500",
  },
  payment_received: {
    label: "결제 완료",
    helpText: "결제가 완료되었습니다. 담당 변리사가 서류를 준비하고 있어요.",
    badgeClass: "bg-emerald-100 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  preparing_filing: {
    label: "출원 준비",
    helpText: "제출 서류를 검토하고 있습니다. 추가 요청이 있을 수 있어요.",
    badgeClass: "bg-indigo-100 text-indigo-700",
    dotClass: "bg-indigo-500",
  },
  filed: {
    label: "출원 완료",
    helpText: "특허청에 출원이 접수되었습니다. 심사 결과를 기다리고 있습니다.",
    badgeClass: "bg-blue-100 text-blue-700",
    dotClass: "bg-blue-500",
  },
  office_action: {
    label: "심사 진행중",
    helpText: "특허청의 검토가 진행 중입니다. 필요한 대응을 안내드릴 예정입니다.",
    badgeClass: "bg-amber-100 text-amber-700",
    dotClass: "bg-amber-500",
  },
  completed: {
    label: "등록 완료",
    helpText: "상표 등록이 완료되었습니다. 등록증 수령 안내를 확인해 주세요.",
    badgeClass: "bg-emerald-100 text-emerald-700",
    dotClass: "bg-emerald-500",
  },
  rejected: {
    label: "거절",
    helpText: "심사 결과 거절되었습니다. 대응 가능 여부를 담당자와 상의해 주세요.",
    badgeClass: "bg-rose-100 text-rose-700",
    dotClass: "bg-rose-500",
  },
  cancelled: {
    label: "취소됨",
    helpText: "요청이 취소되었습니다. 필요 시 새 출원 요청을 생성하세요.",
    badgeClass: "bg-slate-100 text-slate-600",
    dotClass: "bg-slate-400",
  },
  default: {
    label: "확인 필요",
    helpText: "상태 정보를 확인 중입니다. 진행 상황은 담당자를 통해 안내해 드립니다.",
    badgeClass: "bg-slate-100 text-slate-700",
    dotClass: "bg-slate-500",
  },
};

type SubmissionCardProps = {
  request: TrademarkRequest;
  isMutating?: boolean;
  onStatusChange?: (requestId: string, nextStatus: string) => void | Promise<unknown>;
};

type CtaAction =
  | { type: "link"; href: string; label: string; variant?: "primary" | "outline" | "ghost" }
  | { type: "action"; label: string; nextStatus: string };

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
    return value;
  }
}

function resolveStatus(request: TrademarkRequest) {
  const base = STATUS_PRESENTATION[request.status] ?? STATUS_PRESENTATION.default;
  const label = request.statusLabel?.trim() || base.label;
  const description = request.statusDescription?.trim() || base.helpText;
  const badgeClass = request.statusBadgeClass?.trim() || base.badgeClass;
  const dotClass = request.statusDotClass?.trim() || base.dotClass;

  return { label, description, badgeClass, dotClass };
}

function buildActions(request: TrademarkRequest): CtaAction[] {
  const detailHref = `/mypage/requests/${request.id}`;
  const applicantHref = `/mypage/requests/${request.id}/applicant`;

  switch (request.status) {
    case "awaiting_payment":
      return [
        { type: "link", href: detailHref, label: "입금하기", variant: "primary" },
        { type: "link", href: applicantHref, label: "출원인 정보 입력/수정", variant: "outline" },
        { type: "action", label: "입금 완료 처리", nextStatus: "payment_received" },
      ];
    case "payment_received":
      return [
        { type: "link", href: applicantHref, label: "출원인 정보 수정", variant: "outline" },
      ];
    case "preparing_filing":
      return [
        { type: "link", href: applicantHref, label: "출원인 정보 입력/수정", variant: "outline" },
      ];
    default:
      return [];
  }
}

export function SubmissionCard({ request, isMutating = false, onStatusChange }: SubmissionCardProps) {
  const status = resolveStatus(request);
  const actions = buildActions(request);

  const handleStatusChange = async (nextStatus: string) => {
    try {
      await onStatusChange?.(request.id, nextStatus);
    } catch (err) {
      console.error("Failed to update trademark request status", err);
    }
  };

  return (
    <article className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ${status.badgeClass}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} aria-hidden />
              {status.label}
            </span>
            <span className="text-slate-500">업데이트 {formatDateTime(request.lastUpdated ?? request.submittedAt)}</span>
          </div>
          <Link
            href={`/mypage/requests/${request.id}`}
            className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
          >
            상세 보기 →
          </Link>
        </header>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900">{request.brandName}</h3>
          <p className="text-sm text-slate-600">{status.description}</p>
        </div>

        <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-slate-500">출원일</dt>
            <dd className="text-slate-800">{formatDateTime(request.submittedAt)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-slate-500">관리번호</dt>
            <dd className="text-slate-800">{request.referenceCode ?? "-"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-slate-500">출원 클래스</dt>
            <dd className="text-slate-800">{request.classes.length ? request.classes.join(", ") : "-"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-24 shrink-0 text-slate-500">담당 변리사</dt>
            <dd className="text-slate-800">{request.representative ?? "-"}</dd>
          </div>
        </dl>

        {request.statusDescription && request.statusDescription !== status.description ? (
          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{request.statusDescription}</p>
        ) : null}

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-slate-700">최근 상태 이력</h4>
            <span className="text-xs font-medium text-slate-500">
              {request.transitions.length ? `${request.transitions.length}건` : "기록 없음"}
            </span>
          </div>
          <StatusTimeline
            status={request.status}
            statusLogs={request.transitions}
            className="mt-4"
          />
        </div>
      </div>

      <footer className="mt-6 flex flex-col gap-2">
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
              onClick={() => handleStatusChange(action.nextStatus)}
              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {action.label}
            </button>
          );
        })}
      </footer>
    </article>
  );
}
