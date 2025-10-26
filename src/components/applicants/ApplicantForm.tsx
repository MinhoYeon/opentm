"use client";

import { useEffect, useMemo, useState } from "react";

import { AddressSearchModal } from "./AddressSearchModal";
import type { Applicant, ApplicantFormInput } from "./useApplicantSelection";

type ApplicantFormProps = {
  mode: "create" | "edit";
  initialValue?: Partial<Applicant>;
  onSubmit: (input: ApplicantFormInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  businessType: string;
  businessNumber: string;
  isFavorite: boolean;
  metadata: Record<string, unknown>;
};

function normalizeInitialValue(initialValue?: Partial<Applicant>): FormState {
  return {
    name: initialValue?.name ?? "",
    email: initialValue?.email ?? "",
    phone: initialValue?.phone ?? "",
    address: initialValue?.address ?? "",
    businessType: initialValue?.businessType ?? "",
    businessNumber: initialValue?.businessNumber ?? "",
    isFavorite: Boolean(initialValue?.isFavorite),
    metadata: initialValue?.metadata ?? {},
  };
}

export function ApplicantForm({ mode, initialValue, onSubmit, onCancel, isSubmitting }: ApplicantFormProps) {
  const [formState, setFormState] = useState<FormState>(() => normalizeInitialValue(initialValue));
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setFormState(normalizeInitialValue(initialValue));
  }, [initialValue]);

  const isEdit = mode === "edit";

  const isValid = useMemo(() => {
    return Boolean(formState.name.trim() && formState.email.trim());
  }, [formState.email, formState.name]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isValid) {
      setError("필수 항목을 입력해 주세요.");
      return;
    }
    try {
      await onSubmit({
        name: formState.name.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim() || null,
        address: formState.address.trim() || null,
        businessType: formState.businessType.trim() || null,
        businessNumber: formState.businessNumber.trim() || null,
        isFavorite: formState.isFavorite,
        metadata: formState.metadata,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">
        {isEdit ? "출원인 정보 수정" : "새 출원인 등록"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        상표 출원 절차에 사용할 출원인 정보를 입력해 주세요.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">출원인 이름 *</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={formState.name}
            onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">이메일 *</label>
          <input
            type="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">연락처</label>
          <input
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={formState.phone}
            onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="010-0000-0000"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">주소</label>
          <div className="mt-1 flex gap-2">
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={formState.address}
              onChange={(event) => setFormState((prev) => ({ ...prev, address: event.target.value }))}
            />
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="rounded-full border border-indigo-500 px-3 py-2 text-sm font-medium text-indigo-600"
            >
              주소 검색
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">구분</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={formState.businessType}
              onChange={(event) => setFormState((prev) => ({ ...prev, businessType: event.target.value }))}
            >
              <option value="">선택</option>
              <option value="개인">개인</option>
              <option value="법인">법인</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">사업자번호</label>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              value={formState.businessNumber}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, businessNumber: event.target.value }))
              }
              placeholder="숫자와 - 만 입력"
            />
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={formState.isFavorite}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, isFavorite: event.target.checked }))
            }
          />
          즐겨찾기에 추가
        </label>
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSubmitting ? "저장 중..." : isEdit ? "출원인 정보 수정" : "출원인 등록"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-500 hover:underline"
            disabled={isSubmitting}
          >
            취소
          </button>
        </div>
      </form>
      <AddressSearchModal
        open={showModal}
        onClose={() => setShowModal(false)}
        initialQuery={formState.address}
        onSelect={(result) => {
          setFormState((prev) => {
            const addressMetadata = {
              ...(typeof prev.metadata.address === "object" && prev.metadata.address !== null
                ? (prev.metadata.address as Record<string, unknown>)
                : {}),
              roadAddress: result.roadAddress ?? result.address ?? null,
              jibunAddress: result.address ?? null,
              coordinates:
                typeof result.x === "number" && typeof result.y === "number"
                  ? { lat: result.y, lng: result.x }
                  : null,
            };
            return {
              ...prev,
              address: result.roadAddress ?? result.address ?? prev.address,
              metadata: { ...prev.metadata, address: addressMetadata },
            };
          });
          setShowModal(false);
        }}
      />
    </div>
  );
}
