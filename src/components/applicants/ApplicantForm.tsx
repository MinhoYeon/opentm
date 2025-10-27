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
  applicantType: "domestic_individual" | "domestic_corporation" | "";
  nameKorean: string;
  nameEnglish: string;
  nationality: string;
  residentRegistrationNumber: string;
  corporationRegistrationNumber: string;
  businessRegistrationNumber: string;
  phone: string;
  mobilePhone: string;
  email: string;
  postalCode: string;
  address: string;
  deliveryPostalCode: string;
  deliveryAddress: string;
  sameAsResidentialAddress: boolean;
  patentCustomerNumber: string;
  isFavorite: boolean;
  metadata: Record<string, unknown>;
};

function normalizeInitialValue(initialValue?: Partial<Applicant>): FormState {
  return {
    applicantType: (initialValue?.applicantType as "domestic_individual" | "domestic_corporation") ?? "",
    nameKorean: initialValue?.nameKorean ?? "",
    nameEnglish: initialValue?.nameEnglish ?? "",
    nationality: initialValue?.nationality ?? "대한민국",
    residentRegistrationNumber: initialValue?.residentRegistrationNumber ?? "",
    corporationRegistrationNumber: initialValue?.corporationRegistrationNumber ?? "",
    businessRegistrationNumber: initialValue?.businessRegistrationNumber ?? "",
    phone: initialValue?.phone ?? "",
    mobilePhone: initialValue?.mobilePhone ?? "",
    email: initialValue?.email ?? "",
    postalCode: initialValue?.postalCode ?? "",
    address: initialValue?.address ?? "",
    deliveryPostalCode: initialValue?.deliveryPostalCode ?? "",
    deliveryAddress: initialValue?.deliveryAddress ?? "",
    sameAsResidentialAddress: false,
    patentCustomerNumber: initialValue?.patentCustomerNumber ?? "",
    isFavorite: Boolean(initialValue?.isFavorite),
    metadata: initialValue?.metadata ?? {},
  };
}

export function ApplicantForm({ mode, initialValue, onSubmit, onCancel, isSubmitting }: ApplicantFormProps) {
  const [formState, setFormState] = useState<FormState>(() => normalizeInitialValue(initialValue));
  const [error, setError] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showDeliveryAddressModal, setShowDeliveryAddressModal] = useState(false);

  useEffect(() => {
    setFormState(normalizeInitialValue(initialValue));
  }, [initialValue]);

  const isEdit = mode === "edit";

  const isValid = useMemo(() => {
    if (!formState.applicantType) return false;
    if (!formState.nameKorean.trim()) return false;
    if (!formState.email.trim()) return false;
    return true;
  }, [formState.applicantType, formState.nameKorean, formState.email]);

  // Handle "same as residential address" checkbox
  const handleSameAsResidentialChange = (checked: boolean) => {
    setFormState((prev) => ({
      ...prev,
      sameAsResidentialAddress: checked,
      deliveryPostalCode: checked ? prev.postalCode : prev.deliveryPostalCode,
      deliveryAddress: checked ? prev.address : prev.deliveryAddress,
    }));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isValid) {
      setError("필수 항목을 입력해 주세요.");
      return;
    }
    try {
      await onSubmit({
        name: formState.nameKorean.trim(), // For backward compatibility
        email: formState.email.trim(),
        phone: formState.phone.trim() || null,
        address: formState.address.trim() || null,
        businessType: formState.applicantType,
        businessNumber: null,
        isFavorite: formState.isFavorite,
        metadata: formState.metadata,
        applicantType: formState.applicantType,
        nameKorean: formState.nameKorean.trim(),
        nameEnglish: formState.nameEnglish.trim() || null,
        nationality: formState.nationality.trim() || null,
        residentRegistrationNumber: formState.residentRegistrationNumber.trim() || null,
        corporationRegistrationNumber: formState.corporationRegistrationNumber.trim() || null,
        businessRegistrationNumber: formState.businessRegistrationNumber.trim() || null,
        mobilePhone: formState.mobilePhone.trim() || null,
        postalCode: formState.postalCode.trim() || null,
        deliveryPostalCode: formState.deliveryPostalCode.trim() || null,
        deliveryAddress: formState.deliveryAddress.trim() || null,
        patentCustomerNumber: formState.patentCustomerNumber.trim() || null,
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
        {/* 출원인 구분 */}
        <div>
          <label className="text-sm font-medium text-slate-700">출원인 구분 *</label>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            value={formState.applicantType}
            onChange={(event) => setFormState((prev) => ({
              ...prev,
              applicantType: event.target.value as "domestic_individual" | "domestic_corporation" | ""
            }))}
            required
            disabled={isEdit}
          >
            <option value="">선택</option>
            <option value="domestic_individual">국내 자연인</option>
            <option value="domestic_corporation">국내 법인</option>
          </select>
        </div>

        {formState.applicantType && (
          <>
            {/* 성명/명칭 (국문) */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                {formState.applicantType === "domestic_individual" ? "성명(국문)" : "명칭(국문)"} *
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={formState.nameKorean}
                onChange={(event) => setFormState((prev) => ({ ...prev, nameKorean: event.target.value }))}
                required
              />
            </div>

            {/* 성명/명칭 (영문) */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                {formState.applicantType === "domestic_individual" ? "성명(영문)" : "명칭(영문)"}
              </label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={formState.nameEnglish}
                onChange={(event) => setFormState((prev) => ({ ...prev, nameEnglish: event.target.value }))}
                placeholder="예: Hong Gil-dong"
              />
            </div>

            {/* 국적 */}
            <div>
              <label className="text-sm font-medium text-slate-700">국적</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={formState.nationality}
                onChange={(event) => setFormState((prev) => ({ ...prev, nationality: event.target.value }))}
              />
            </div>

            {/* 자연인: 주민등록번호 / 법인: 법인등록번호, 사업자등록번호 */}
            {formState.applicantType === "domestic_individual" ? (
              <div>
                <label className="text-sm font-medium text-slate-700">주민등록번호</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  value={formState.residentRegistrationNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, residentRegistrationNumber: event.target.value }))}
                  placeholder="000000-0000000"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-slate-700">법인등록번호</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    value={formState.corporationRegistrationNumber}
                    onChange={(event) => setFormState((prev) => ({ ...prev, corporationRegistrationNumber: event.target.value }))}
                    placeholder="000000-0000000"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">사업자등록번호</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    value={formState.businessRegistrationNumber}
                    onChange={(event) => setFormState((prev) => ({ ...prev, businessRegistrationNumber: event.target.value }))}
                    placeholder="000-00-00000"
                  />
                </div>
              </>
            )}

            {/* 전화번호 */}
            <div>
              <label className="text-sm font-medium text-slate-700">전화번호</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={formState.phone}
                onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="02-0000-0000"
              />
            </div>

            {/* 휴대폰번호 */}
            <div>
              <label className="text-sm font-medium text-slate-700">휴대폰번호</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={formState.mobilePhone}
                onChange={(event) => setFormState((prev) => ({ ...prev, mobilePhone: event.target.value }))}
                placeholder="010-0000-0000"
              />
            </div>

            {/* 이메일 */}
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

            {/* 우편번호(주민등록상) */}
            <div>
              <label className="text-sm font-medium text-slate-700">우편번호(주민등록상)</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={formState.postalCode}
                onChange={(event) => {
                  const newPostalCode = event.target.value;
                  setFormState((prev) => ({
                    ...prev,
                    postalCode: newPostalCode,
                    deliveryPostalCode: prev.sameAsResidentialAddress ? newPostalCode : prev.deliveryPostalCode,
                  }));
                }}
                placeholder="00000"
              />
            </div>

            {/* 주소(주민등록상) */}
            <div>
              <label className="text-sm font-medium text-slate-700">주소(주민등록상)</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  value={formState.address}
                  onChange={(event) => {
                    const newAddress = event.target.value;
                    setFormState((prev) => ({
                      ...prev,
                      address: newAddress,
                      deliveryAddress: prev.sameAsResidentialAddress ? newAddress : prev.deliveryAddress,
                    }));
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="whitespace-nowrap rounded-full border border-indigo-500 px-3 py-2 text-sm font-medium text-indigo-600"
                >
                  주소 검색
                </button>
              </div>
            </div>

            {/* 우편번호(송달장소) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">우편번호(송달장소)</label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formState.sameAsResidentialAddress}
                    onChange={(event) => handleSameAsResidentialChange(event.target.checked)}
                  />
                  위 주민등록상 주소와 동일
                </label>
              </div>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={formState.deliveryPostalCode}
                onChange={(event) => setFormState((prev) => ({ ...prev, deliveryPostalCode: event.target.value }))}
                placeholder="00000"
                disabled={formState.sameAsResidentialAddress}
              />
            </div>

            {/* 주소(송달장소) */}
            <div>
              <label className="text-sm font-medium text-slate-700">주소(송달장소)</label>
              <div className="mt-1 flex gap-2">
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
                  value={formState.deliveryAddress}
                  onChange={(event) => setFormState((prev) => ({ ...prev, deliveryAddress: event.target.value }))}
                  disabled={formState.sameAsResidentialAddress}
                />
                <button
                  type="button"
                  onClick={() => setShowDeliveryAddressModal(true)}
                  className="whitespace-nowrap rounded-full border border-indigo-500 px-3 py-2 text-sm font-medium text-indigo-600 disabled:opacity-50"
                  disabled={formState.sameAsResidentialAddress}
                >
                  주소 검색
                </button>
              </div>
            </div>

            {/* 특허고객번호 (자연인만 표시) */}
            {formState.applicantType === "domestic_individual" && (
              <div>
                <label className="text-sm font-medium text-slate-700">특허고객번호(있는 경우)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  value={formState.patentCustomerNumber}
                  onChange={(event) => setFormState((prev) => ({ ...prev, patentCustomerNumber: event.target.value }))}
                  placeholder="특허고객번호를 입력하세요"
                />
              </div>
            )}
          </>
        )}

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
        open={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        initialQuery={formState.address}
        onSelect={(result) => {
          setFormState((prev) => {
            const addressMetadata = {
              ...(typeof prev.metadata.address === "object" && prev.metadata.address !== null
                ? (prev.metadata.address as Record<string, unknown>)
                : {}),
              roadAddress: result.roadAddress,
              jibunAddress: result.address,
              postalCode: result.postalCode,
            };
            const newAddress = result.roadAddress;
            const newPostalCode = result.postalCode;
            return {
              ...prev,
              postalCode: newPostalCode,
              address: newAddress,
              deliveryPostalCode: prev.sameAsResidentialAddress ? newPostalCode : prev.deliveryPostalCode,
              deliveryAddress: prev.sameAsResidentialAddress ? newAddress : prev.deliveryAddress,
              metadata: { ...prev.metadata, address: addressMetadata },
            };
          });
          setShowAddressModal(false);
        }}
      />
      <AddressSearchModal
        open={showDeliveryAddressModal}
        onClose={() => setShowDeliveryAddressModal(false)}
        initialQuery={formState.deliveryAddress}
        onSelect={(result) => {
          setFormState((prev) => {
            const deliveryAddressMetadata = {
              ...(typeof prev.metadata.deliveryAddress === "object" && prev.metadata.deliveryAddress !== null
                ? (prev.metadata.deliveryAddress as Record<string, unknown>)
                : {}),
              roadAddress: result.roadAddress,
              jibunAddress: result.address,
              postalCode: result.postalCode,
            };
            return {
              ...prev,
              deliveryPostalCode: result.postalCode,
              deliveryAddress: result.roadAddress,
              metadata: { ...prev.metadata, deliveryAddress: deliveryAddressMetadata },
            };
          });
          setShowDeliveryAddressModal(false);
        }}
      />
    </div>
  );
}
