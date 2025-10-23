"use client";

import type { Applicant } from "./useApplicantSelection";

type ApplicantCardProps = {
  applicant: Applicant;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  disabled?: boolean;
};

function formatLastUsed(lastUsedAt: string | null) {
  if (!lastUsedAt) {
    return "최근 사용 기록 없음";
  }
  try {
    const value = new Date(lastUsedAt).getTime();
    if (Number.isNaN(value)) {
      return "최근 사용 기록 없음";
    }
    const diff = Date.now() - value;
    const minutes = Math.round(diff / (1000 * 60));
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}일 전`;
    const months = Math.round(days / 30);
    if (months < 12) return `${months}개월 전`;
    const years = Math.round(months / 12);
    return `${years}년 전`;
  } catch {
    return "최근 사용 기록 없음";
  }
}

export function ApplicantCard({
  applicant,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFavorite,
  disabled,
}: ApplicantCardProps) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 transition ${
        selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          className="flex-1 text-left"
          onClick={onSelect}
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-xl ${applicant.isFavorite ? "text-amber-500" : "text-slate-300"}`}
              aria-hidden
            >
              ★
            </span>
            <p className="text-lg font-semibold text-slate-900">{applicant.name}</p>
          </div>
          <p className="mt-1 text-sm text-slate-600">{applicant.email}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            {applicant.phoneMasked ? <span>연락처 {applicant.phoneMasked}</span> : null}
            {applicant.addressMasked ? <span>주소 {applicant.addressMasked}</span> : null}
            {applicant.businessType ? <span>구분 {applicant.businessType}</span> : null}
            {applicant.businessNumberMasked ? (
              <span>사업자번호 {applicant.businessNumberMasked}</span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-400">{formatLastUsed(applicant.lastUsedAt)}</p>
        </button>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`text-sm ${applicant.isFavorite ? "text-amber-500" : "text-slate-400"}`}
            disabled={disabled}
          >
            {applicant.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
          </button>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={onEdit}
              className="text-indigo-600 hover:underline"
              disabled={disabled}
            >
              편집
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="text-rose-500 hover:underline"
              disabled={disabled}
            >
              삭제
            </button>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              selected ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
            }`}
            disabled={disabled}
          >
            {selected ? "선택됨" : "선택"}
          </button>
        </div>
      </div>
    </div>
  );
}
