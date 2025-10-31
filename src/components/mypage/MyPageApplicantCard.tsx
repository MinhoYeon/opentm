"use client";

import { useState } from "react";
import type { ApplicantDTO } from "@/server/db/applicants";
import { ApplicantForm } from "@/components/applicants/ApplicantForm";
import type { ApplicantFormInput } from "@/components/applicants/useApplicantSelection";

type MyPageApplicantCardProps = {
  applicant: ApplicantDTO;
  onEdit: (id: string, input: ApplicantFormInput) => Promise<void>;
  onDelete: (id: string) => void;
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

export function MyPageApplicantCard({ applicant, onEdit, onDelete, disabled }: MyPageApplicantCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isIndividual = applicant.applicantType === "domestic_individual";
  const isCorporation = applicant.applicantType === "domestic_corporation";

  const getApplicantTypeLabel = () => {
    if (isIndividual) return "국내 자연인";
    if (isCorporation) return "국내 법인";
    return "-";
  };

  const nameLabel = isCorporation ? "명칭" : "성명";

  async function handleSubmit(input: ApplicantFormInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      await onEdit(applicant.id, input);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "출원인 정보를 수정하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    setIsEditing(false);
    setError(null);
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}
        <ApplicantForm
          mode="edit"
          initialValue={applicant}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-300">
      <div className="space-y-4">
        {/* 첫번째 행: 성명/명칭 (큰 bold) | 편집/삭제 버튼 */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">
            {applicant.nameKorean || applicant.name || "-"}
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-indigo-600 hover:underline disabled:opacity-50"
              disabled={disabled}
            >
              편집
            </button>
            <button
              type="button"
              onClick={() => onDelete(applicant.id)}
              className="text-rose-500 hover:underline disabled:opacity-50"
              disabled={disabled}
            >
              삭제
            </button>
          </div>
        </div>

        {/* 두번째 행: 2컬럼 그리드 */}
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
          {/* 왼쪽 컬럼 */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">출원인 구분</span>
              <span className="text-slate-900">{getApplicantTypeLabel()}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">{nameLabel}(국문)</span>
              <span className="text-slate-900">{applicant.nameKorean || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">{nameLabel}(영문)</span>
              <span className="text-slate-900">{applicant.nameEnglish || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">국적</span>
              <span className="text-slate-900">{applicant.nationality || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">특허고객번호</span>
              <span className="text-slate-900">
                {applicant.patentCustomerNumber || <span className="text-slate-400">미입력</span>}
              </span>
            </div>
          </div>

          {/* 오른쪽 컬럼 */}
          <div className="space-y-2">
            {isIndividual && (
              <div className="flex gap-2">
                <span className="w-28 shrink-0 font-medium text-slate-600">주민등록번호</span>
                <span className="text-slate-900">{applicant.residentRegistrationNumberMasked || "-"}</span>
              </div>
            )}
            {isCorporation && (
              <>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">법인등록번호</span>
                  <span className="text-slate-900">{applicant.corporationRegistrationNumberMasked || "-"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">사업자등록번호</span>
                  <span className="text-slate-900">{applicant.businessRegistrationNumberMasked || "-"}</span>
                </div>
              </>
            )}
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">전화번호</span>
              <span className="text-slate-900">{applicant.phoneMasked || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">휴대폰번호</span>
              <span className="text-slate-900">{applicant.mobilePhoneMasked || "-"}</span>
            </div>
            <div className="flex gap-2">
              <span className="w-28 shrink-0 font-medium text-slate-600">이메일</span>
              <span className="text-slate-900">{applicant.email || "-"}</span>
            </div>
          </div>
        </div>

        {/* 세번째 행: 주소 정보 */}
        <div className="space-y-2 pt-3 border-t border-slate-200 text-sm">
          <div className="flex gap-2">
            <span className="w-36 shrink-0 font-medium text-slate-600">우편번호(주민등록상)</span>
            <span className="text-slate-900">{applicant.postalCode || "-"}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 shrink-0 font-medium text-slate-600">주소(주민등록상)</span>
            <span className="text-slate-900">{applicant.addressMasked || "-"}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 shrink-0 font-medium text-slate-600">우편번호(송달장소)</span>
            <span className="text-slate-900">{applicant.deliveryPostalCode || "-"}</span>
          </div>
          <div className="flex gap-2">
            <span className="w-36 shrink-0 font-medium text-slate-600">주소(송달장소)</span>
            <span className="text-slate-900">{applicant.deliveryAddressMasked || "-"}</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 pt-2">{formatLastUsed(applicant.lastUsedAt)}</p>
      </div>
    </div>
  );
}
