"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { UploadedImage } from "./components/TrademarkImageUploader";
import { TrademarkImageUploader } from "./components/TrademarkImageUploader";
import { useCreateTrademarkRequest } from "./useCreateTrademarkRequest";

const TRADEMARK_TYPES = [
  { value: "word", label: "워드 상표" },
  { value: "design", label: "도형 상표" },
  { value: "combined", label: "복합 상표" },
] as const;

const PRODUCT_CLASS_GROUPS = [
  {
    label: "식품 & 음료",
    options: ["제30류(커피·디저트)", "제32류(음료)", "제43류(식당 서비스)"],
  },
  {
    label: "패션 & 라이프스타일",
    options: ["제25류(의류)", "제18류(가방)", "제35류(소매·도소매)"],
  },
  {
    label: "IT & SaaS",
    options: ["제09류(소프트웨어)", "제42류(기술 서비스)", "제45류(지식재산 자문)"],
  },
];

type NewTrademarkClientProps = {
  userId: string;
  userEmail?: string | null;
};

type FormState = {
  brandName: string;
  trademarkType: string;
  productClasses: string[];
  representativeEmail: string;
  additionalNotes: string;
  image: UploadedImage | null;
};

const initialFormState = (userEmail?: string | null): FormState => ({
  brandName: "",
  trademarkType: "",
  productClasses: [],
  representativeEmail: userEmail ?? "",
  additionalNotes: "",
  image: null,
});

export function NewTrademarkClient({ userId, userEmail }: NewTrademarkClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialFormState(userEmail));
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const { isSubmitting, error, submit, reset } = useCreateTrademarkRequest();

  const isFormValid = useMemo(() => {
    return Boolean(form.brandName.trim() && form.trademarkType && form.representativeEmail.trim());
  }, [form.brandName, form.trademarkType, form.representativeEmail]);

  const toggleClass = (productClass: string) => {
    setForm((prev) => {
      const exists = prev.productClasses.includes(productClass);
      return {
        ...prev,
        productClasses: exists
          ? prev.productClasses.filter((item) => item !== productClass)
          : [...prev.productClasses, productClass],
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !isFormValid) {
      return;
    }

    const created = await submit({
      userId,
      brandName: form.brandName,
      trademarkType: form.trademarkType,
      productClasses: form.productClasses,
      representativeEmail: form.representativeEmail,
      additionalNotes: form.additionalNotes,
      image: form.image,
    });

    if (created) {
      setSuccessMessage(`${created.brandName} 상표 출원 요청이 저장되었습니다.`);
      setSuccessLink(`/mypage/requests/${created.id}`);
      setForm(initialFormState(userEmail));
      reset();
      setTimeout(() => {
        router.prefetch(`/mypage/requests/${created.id}`);
      }, 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-indigo-500">새 상표 출원 요청</p>
          <h1 className="text-3xl font-semibold text-slate-900">브랜드 정보를 입력하세요</h1>
          <p className="text-sm text-slate-600">
            상표명과 유형, 대표 이미지, 상품류를 입력하면 빠르게 상담을 시작할 수 있습니다.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="brandName" className="text-sm font-medium text-slate-700">
                상표명
              </label>
              <input
                id="brandName"
                name="brandName"
                type="text"
                value={form.brandName}
                onChange={(event) => setForm((prev) => ({ ...prev, brandName: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="예: 오픈TM"
                required
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-slate-700">상표 유형</span>
              <div className="flex flex-wrap gap-2">
                {TRADEMARK_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, trademarkType: type.value }))}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      form.trademarkType === type.value
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-slate-700 hover:border-indigo-400 hover:text-indigo-600"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">상표 이미지</h2>
        <p className="text-sm text-slate-600">
          드래그 앤 드롭 또는 클릭하여 상표 이미지를 업로드하세요. 이미지는 출원 진행에 참고 자료로 활용됩니다.
        </p>
        <TrademarkImageUploader
          userId={userId}
          value={form.image}
          onChange={(image) => setForm((prev) => ({ ...prev, image }))}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">상품류 선택</h2>
        <p className="text-sm text-slate-600">
          출원하고자 하는 상품 또는 서비스의 클래스를 선택해 주세요. 여러 클래스를 함께 선택할 수 있습니다.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PRODUCT_CLASS_GROUPS.map((group) => (
            <fieldset key={group.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <legend className="text-sm font-semibold text-slate-800">{group.label}</legend>
              <div className="mt-3 space-y-2">
                {group.options.map((option) => {
                  const checked = form.productClasses.includes(option);
                  return (
                    <label key={option} className="flex items-center justify-between gap-2 text-sm text-slate-700">
                      <span>{option}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(option)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">담당자 연락처</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              대표 이메일
              <input
                type="email"
                value={form.representativeEmail}
                onChange={(event) => setForm((prev) => ({ ...prev, representativeEmail: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="contact@example.com"
                required
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              추가 요청 사항
              <textarea
                value={form.additionalNotes}
                onChange={(event) => setForm((prev) => ({ ...prev, additionalNotes: event.target.value }))}
                className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="출원 시 참고해야 할 메모가 있다면 작성해 주세요."
              />
            </label>
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {successMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <p>{successMessage}</p>
          {successLink ? (
            <button
              type="button"
              onClick={() => router.push(successLink)}
              className="mt-2 rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              출원 상세 페이지로 이동
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={!isFormValid || isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "제출 중..." : "출원 요청 제출"}
        </button>
        <button
          type="button"
          onClick={() => setForm(initialFormState(userEmail))}
          className="text-sm text-slate-600 underline"
        >
          입력 초기화
        </button>
      </div>
    </form>
  );
}
