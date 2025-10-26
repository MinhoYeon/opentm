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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-slate-900">
            {applicant.nameKorean || applicant.name}
          </h1>
          {!isEditing && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-full border border-indigo-500 bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                편집
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="rounded-full border border-rose-500 bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                삭제
              </button>
            </div>
          )}
        </div>
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
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">출원인 구분</dt>
              <dd className="text-slate-900">
                {applicant.applicantType === "domestic_individual"
                  ? "국내 자연인"
                  : applicant.applicantType === "domestic_corporation"
                    ? "국내 법인"
                    : "-"}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">성명(국문)</dt>
              <dd className="text-slate-900">{applicant.nameKorean || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">성명(영문)</dt>
              <dd className="text-slate-900">{applicant.nameEnglish || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">국적</dt>
              <dd className="text-slate-900">{applicant.nationality || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">이메일</dt>
              <dd className="text-slate-900">{applicant.email || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">전화번호</dt>
              <dd className="text-slate-900">{applicant.phoneMasked || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">휴대전화번호</dt>
              <dd className="text-slate-900">{applicant.mobilePhoneMasked || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">주민등록번호</dt>
              <dd className="text-slate-900">{applicant.residentRegistrationNumberMasked || "-"}</dd>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">주소</dt>
              <dd className="text-slate-900">{applicant.addressMasked || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">우편번호</dt>
              <dd className="text-slate-900">{applicant.postalCode || "-"}</dd>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">배송지 주소</dt>
              <dd className="text-slate-900">{applicant.deliveryAddressMasked || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">배송지 우편번호</dt>
              <dd className="text-slate-900">{applicant.deliveryPostalCode || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">법인등록번호</dt>
              <dd className="text-slate-900">{applicant.corporationRegistrationNumberMasked || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">사업자등록번호</dt>
              <dd className="text-slate-900">{applicant.businessRegistrationNumberMasked || "-"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 shrink-0 font-medium text-slate-700">특허고객번호</dt>
              <dd className="text-slate-900">{applicant.patentCustomerNumber || "-"}</dd>
            </div>
          </dl>
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
