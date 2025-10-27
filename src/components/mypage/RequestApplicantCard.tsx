"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type ApplicantInfo = {
  nameKorean: string;
  nameEnglish?: string;
  applicantType?: string;
  nationality?: string;
  residentRegistrationNumberMasked?: string;
  corporationRegistrationNumberMasked?: string;
  businessRegistrationNumberMasked?: string;
  phoneMasked?: string;
  mobilePhoneMasked?: string;
  email?: string;
  addressMasked?: string;
  addressPostalCode?: string;
  deliveryPostalCode?: string;
  deliveryAddressMasked?: string;
  patentCustomerNumber?: string;
};

type RequestApplicantCardProps = {
  applicant: ApplicantInfo;
  index: number;
};

export function RequestApplicantCard({ applicant, index }: RequestApplicantCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isIndividual = applicant.applicantType === "domestic_individual";
  const isCorporation = applicant.applicantType === "domestic_corporation";
  const nameLabel = isCorporation ? "명칭" : "성명";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="mb-3 text-xs font-medium text-slate-500">출원인 {index + 1}</p>
      <div className="space-y-4">
        {/* 첫번째 행: 성명/명칭 (큰 bold) - 클릭 가능 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-start justify-between gap-4 pb-3 border-b border-slate-200 text-left hover:bg-slate-50 -mx-5 px-5 -mt-5 pt-5 transition-colors"
        >
          <h3 className="text-xl font-bold text-slate-900">
            {applicant.nameKorean}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">
              {isExpanded ? "접기" : "자세히 보기"}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-600" />
            )}
          </div>
        </button>

        {/* 두번째 행과 세번째 행: 드롭다운 */}
        {isExpanded && (
          <>
            {/* 두번째 행: 2컬럼 그리드 */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              {/* 왼쪽 컬럼 */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">출원인 구분</span>
                  <span className="text-slate-900">
                    {isIndividual ? "국내 자연인" : isCorporation ? "국내 법인" : "-"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">{nameLabel}(국문)</span>
                  <span className="text-slate-900">{applicant.nameKorean}</span>
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

            {/* 세번째 행: 수직 레이아웃 */}
            <div className="space-y-2 pt-3 border-t border-slate-200 text-sm">
              <div className="flex gap-2">
                <span className="w-36 shrink-0 font-medium text-slate-600">우편번호(주민등록상)</span>
                <span className="text-slate-900">{applicant.addressPostalCode || "-"}</span>
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
          </>
        )}
      </div>
    </div>
  );
}
