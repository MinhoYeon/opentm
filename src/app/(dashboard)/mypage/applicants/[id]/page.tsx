"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ApplicantForm } from "@/components/applicants/ApplicantForm";
import type { Applicant, ApplicantFormInput } from "@/components/applicants/useApplicantSelection";

export default function ApplicantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const applicantId = params.id as string;

  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function fetchApplicant() {
      try {
        const response = await fetch(`/api/applicants/${applicantId}`);
        if (!response.ok) {
          throw new Error("출원인 정보를 불러오지 못했습니다.");
        }
        const data = await response.json();
        setApplicant(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "출원인 정보를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchApplicant();
  }, [applicantId]);

  async function handleSubmit(input: ApplicantFormInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/applicants/${applicantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "출원인 정보를 수정하지 못했습니다.");
      }

      const updated = await response.json();
      setApplicant(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "출원인 정보를 수정하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 출원인을 삭제하시겠습니까?")) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/applicants/${applicantId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "출원인을 삭제하지 못했습니다.");
      }

      router.push("/mypage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "출원인을 삭제하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    if (isEditing) {
      setIsEditing(false);
    } else {
      router.push("/mypage");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-600">불러오는 중...</p>
      </div>
    );
  }

  if (error && !applicant) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
        <button
          type="button"
          onClick={() => router.push("/mypage")}
          className="text-sm text-indigo-600 hover:underline"
        >
          마이페이지로 돌아가기
        </button>
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="space-y-6">
        <p className="text-slate-600">출원인을 찾을 수 없습니다.</p>
        <button
          type="button"
          onClick={() => router.push("/mypage")}
          className="text-sm text-indigo-600 hover:underline"
        >
          마이페이지로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-indigo-500">출원인 상세</p>
        <h1 className="text-3xl font-semibold text-slate-900">
          {applicant.nameKorean || applicant.name}
        </h1>
        <p className="text-sm text-slate-600">출원인 정보를 확인하고 수정할 수 있습니다.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isEditing ? (
        <ApplicantForm
          mode="edit"
          initialValue={applicant}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                  className="text-indigo-600 hover:underline"
                >
                  편집
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="text-rose-500 hover:underline disabled:opacity-50"
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
                  <span className="text-slate-900">
                    {applicant.applicantType === "domestic_individual"
                      ? "국내 자연인"
                      : applicant.applicantType === "domestic_corporation"
                        ? "국내 법인"
                        : "-"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">
                    {applicant.applicantType === "domestic_corporation" ? "명칭" : "성명"}(국문)
                  </span>
                  <span className="text-slate-900">{applicant.nameKorean || "-"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">
                    {applicant.applicantType === "domestic_corporation" ? "명칭" : "성명"}(영문)
                  </span>
                  <span className="text-slate-900">{applicant.nameEnglish || "-"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">국적</span>
                  <span className="text-slate-900">{applicant.nationality || "-"}</span>
                </div>
                <div className="flex gap-2">
                  <span className="w-28 shrink-0 font-medium text-slate-600">특허고객번호</span>
                  <span className="text-slate-900">{applicant.patentCustomerNumber || <span className="text-slate-400">미입력</span>}</span>
                </div>
              </div>

              {/* 오른쪽 컬럼 */}
              <div className="space-y-2">
                {applicant.applicantType === "domestic_individual" && (
                  <div className="flex gap-2">
                    <span className="w-28 shrink-0 font-medium text-slate-600">주민등록번호</span>
                    <span className="text-slate-900">{applicant.residentRegistrationNumberMasked || "-"}</span>
                  </div>
                )}
                {applicant.applicantType === "domestic_corporation" && (
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
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm text-slate-600 hover:underline"
            >
              마이페이지로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
