"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApplicantForm } from "@/components/applicants/ApplicantForm";
import type { ApplicantFormInput } from "@/components/applicants/useApplicantSelection";

export default function NewApplicantPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(input: ApplicantFormInput) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "출원인을 생성하지 못했습니다.");
      }

      router.push("/mypage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "출원인을 생성하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/mypage");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-indigo-500">출원인 등록</p>
        <h1 className="text-3xl font-semibold text-slate-900">새 출원인 등록</h1>
        <p className="text-sm text-slate-600">
          새로운 출원인의 정보를 입력해 주세요. 등록된 출원인은 상표 출원 요청 시 선택할 수 있습니다.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <ApplicantForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
