"use client";

import type { Applicant } from "./useApplicantSelection";

type ApplicantCardProps = {
  applicant: Applicant;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
  disabled,
}: ApplicantCardProps) {
  const getApplicantTypeLabel = () => {
    if (applicant.applicantType === "domestic_individual") return "국내 자연인";
    if (applicant.applicantType === "domestic_corporation") return "국내 법인";
    return "-";
  };

  return (
    <div
      className={`rounded-xl border px-4 py-4 transition cursor-pointer ${
        selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold text-slate-900">
              {applicant.nameKorean || applicant.name || "-"}
            </p>
            {selected && (
              <span className="rounded-full bg-indigo-600 px-2 py-1 text-xs font-medium text-white">
                선택됨
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {/* 왼쪽 열 */}
            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">출원인 구분</span>
              <span className="text-slate-900">{getApplicantTypeLabel()}</span>
            </div>
            {/* 오른쪽 열 */}
            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">이메일</span>
              <span className="text-slate-900">{applicant.email || "-"}</span>
            </div>

            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">성명(영문)</span>
              <span className="text-slate-900">{applicant.nameEnglish || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">국적</span>
              <span className="text-slate-900">{applicant.nationality || "-"}</span>
            </div>

            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">전화번호</span>
              <span className="text-slate-900">{applicant.phoneMasked || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">휴대전화</span>
              <span className="text-slate-900">{applicant.mobilePhoneMasked || "-"}</span>
            </div>

            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">주민등록번호</span>
              <span className="text-slate-900">{applicant.residentRegistrationNumberMasked || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">법인등록번호</span>
              <span className="text-slate-900">{applicant.corporationRegistrationNumberMasked || "-"}</span>
            </div>

            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">사업자등록번호</span>
              <span className="text-slate-900">{applicant.businessRegistrationNumberMasked || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">우편번호</span>
              <span className="text-slate-900">{applicant.postalCode || "-"}</span>
            </div>

            <div className="flex gap-2 col-span-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">주소</span>
              <span className="text-slate-900">{applicant.addressMasked || "-"}</span>
            </div>

            <div className="flex gap-2 col-span-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">배송지 주소</span>
              <span className="text-slate-900">{applicant.deliveryAddressMasked || "-"}</span>
            </div>

            <div className="flex gap-2">
              <span className="w-32 shrink-0 font-medium text-slate-600">특허고객번호</span>
              <span className="text-slate-900">{applicant.patentCustomerNumber || "-"}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400">{formatLastUsed(applicant.lastUsedAt)}</p>
        </div>

        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
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
        </div>
      </div>
    </div>
  );
}
