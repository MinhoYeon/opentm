"use client";

import Link from "next/link";

import { getStatusMetadata } from "@/lib/status";

import type { TrademarkRequest } from "../types";

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
  const metadata = getStatusMetadata(request.status);
  const label = request.statusLabel?.trim() || metadata.label;
  const description = request.statusDescription?.trim() || metadata.helpText;
  const badgeClass = request.statusBadgeClass?.trim() || metadata.badge.backgroundClass;
  const dotClass = request.statusDotClass?.trim() || metadata.badge.dotClass;

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
    case "awaiting_documents":
      return [
        { type: "link", href: detailHref, label: "요청 사항 확인", variant: "primary" },
        { type: "link", href: applicantHref, label: "출원인 정보 입력/수정", variant: "outline" },
      ];
    case "preparing_filing":
      return [
        { type: "link", href: applicantHref, label: "출원인 정보 입력/수정", variant: "outline" },
      ];
    case "awaiting_client_signature":
      return [
        { type: "link", href: detailHref, label: "전자서명 하기", variant: "primary" },
        { type: "link", href: applicantHref, label: "출원인 정보 확인", variant: "outline" },
      ];
    case "awaiting_client_response":
      return [
        { type: "link", href: detailHref, label: "의견서 안내 확인", variant: "primary" },
      ];
    case "awaiting_registration_fee":
      return [
        { type: "link", href: detailHref, label: "등록료 납부 안내", variant: "primary" },
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
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        href={`/mypage/requests/${request.id}`}
        className="flex gap-6"
      >
        {/* 좌측 컬럼 (80%) */}
        <div className="flex-[8] space-y-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{request.brandName}</h3>
            <span className="inline-flex items-center text-sm font-medium text-indigo-600 transition hover:text-indigo-500">
              상세 보기 →
            </span>
          </div>

          <dl className="grid gap-3 text-sm text-slate-600">
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">관리번호</dt>
              <dd className="text-slate-800">{request.id}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">상표명</dt>
              <dd className="text-slate-800">{request.brandName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">상품류</dt>
              <dd className="text-slate-800">{request.classes.length ? request.classes.join(", ") : "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">출원인</dt>
              <dd className="text-slate-800">{request.applicantName ?? "미선택"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">현재 상태</dt>
              <dd className="text-slate-800">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${status.badgeClass}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} aria-hidden />
                  {status.label}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        {/* 우측 컬럼 (20%) */}
        <div className="flex-[2]">
          {request.imageUrl ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={request.imageUrl} alt="상표 이미지" className="w-full h-auto object-contain" />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500">
              이미지 없음
            </div>
          )}
        </div>
      </Link>

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
