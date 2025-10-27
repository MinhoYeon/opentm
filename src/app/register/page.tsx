"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";

import { submitTrademarkRequest, type TrademarkType } from "./actions";

type StoredImage = {
  dataUrl: string;
  fileName: string;
  fileType: string;
  size: number;
};

interface TrademarkApplication {
  brandName: string;
  image: StoredImage | null;
  productClasses: string[];
  representativeEmail: string;
  additionalNotes: string;
  agreeToTerms: boolean;
}

const productClassGroups = [
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

const storageKey = "register-form";

function getInitialState(): TrademarkApplication {
  if (typeof window === "undefined") {
    return {
      brandName: "",
      image: null,
      productClasses: [],
      representativeEmail: "",
      additionalNotes: "",
      agreeToTerms: false,
    };
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      throw new Error("no stored data");
    }
    const parsed = JSON.parse(stored) as TrademarkApplication;
    return {
      ...parsed,
      image: parsed.image ?? null,
      productClasses: parsed.productClasses ?? [],
      agreeToTerms: Boolean(parsed.agreeToTerms),
    };
  } catch {
    return {
      brandName: "",
      image: null,
      productClasses: [],
      representativeEmail: "",
      additionalNotes: "",
      agreeToTerms: false,
    };
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<TrademarkApplication>(() => getInitialState());
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...formData,
        image: formData.image
          ? {
              dataUrl: formData.image.dataUrl,
              fileName: formData.image.fileName,
              fileType: formData.image.fileType,
              size: formData.image.size,
            }
          : null,
      })
    );
  }, [formData]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setErrors(["로그인이 필요합니다. 먼저 로그인해 주세요."]);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors([]);

      // 이미지 유무에 따라 상표 유형 자동 결정
      const trademarkType: TrademarkType = formData.image ? "combined" : "word";

      const result = await submitTrademarkRequest({
        brandName: formData.brandName,
        trademarkType,
        productClasses: formData.productClasses,
        representativeEmail: formData.representativeEmail,
        additionalNotes: formData.additionalNotes,
        userId: user.id,
        image: formData.image
          ? {
              dataUrl: formData.image.dataUrl,
              fileName: formData.image.fileName,
              fileType: formData.image.fileType,
              size: formData.image.size,
            }
          : null,
      });

      if (!result.success) {
        setErrors(result.errors);
        return;
      }

      // localStorage 초기화
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      // 성공 시 상세 페이지로 자동 리다이렉트
      router.push(`/mypage/requests/${result.requestId}`);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "신청 접수 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-pink-300/80">JINJUNG TRADEMARK LAB</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">상표 등록 신청</h1>
          <p className="text-sm text-slate-300 sm:text-base">
            필요한 정보를 입력하시면 담당 변리사에게 즉시 전달됩니다.
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl shadow-purple-900/20 backdrop-blur">

          <form className="space-y-8" onSubmit={handleSubmit}>
            {/* 상표명 섹션 */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">상표명</h2>
                <p className="mt-1 text-sm text-slate-400">
                  출원하고자 하는 브랜드 또는 서비스명을 정확히 입력해 주세요.
                </p>
              </div>
              <input
                id="brandName"
                type="text"
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
                placeholder="예: 오픈상표"
                value={formData.brandName}
                onChange={(event) =>
                  setFormData((data) => ({
                    ...data,
                    brandName: event.target.value,
                  }))
                }
              />
            </section>

            {/* 이미지 업로드 섹션 */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">상표 이미지 (선택)</h2>
                <p className="mt-1 text-sm text-slate-400">
                  로고나 디자인이 있다면 이미지를 업로드해 주세요. (PNG, JPG, SVG)
                </p>
              </div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="w-full rounded-lg border border-dashed border-pink-400/50 bg-slate-900/60 px-4 py-6 text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-pink-500/20 file:px-4 file:py-2 file:text-pink-100"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) {
                    setFormData((data) => ({ ...data, image: null }));
                    return;
                  }

                  if (file.size > 5 * 1024 * 1024) {
                    setErrors(["이미지 파일은 5MB 이하만 업로드할 수 있습니다."]);
                    return;
                  }

                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const result = reader.result as string;
                    setFormData((data) => ({
                      ...data,
                      image: {
                        dataUrl: result,
                        fileName: file.name,
                        fileType: file.type,
                        size: file.size,
                      },
                    }));
                  };
                  reader.readAsDataURL(file);
                }}
              />
              {formData.image && (
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 text-xs text-slate-300">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-100">{formData.image.fileName}</span>
                    <span>
                      {(formData.image.size / 1024).toFixed(1)}KB • {formData.image.fileType}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-pink-300 transition hover:text-pink-100"
                    onClick={() => setFormData((data) => ({ ...data, image: null }))}
                  >
                    제거
                  </button>
                </div>
              )}
            </section>

            {/* 브랜드 메모 섹션 */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">브랜드 메모 (선택)</h2>
                <p className="mt-1 text-sm text-slate-400">
                  프로젝트 배경, 활용 예정 국가 등 추가 정보를 알려주세요.
                </p>
              </div>
              <textarea
                id="additionalNotes"
                className="h-28 w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
                placeholder="추가로 전달하고 싶은 내용이 있다면 입력해 주세요."
                value={formData.additionalNotes}
                onChange={(event) =>
                  setFormData((data) => ({
                    ...data,
                    additionalNotes: event.target.value,
                  }))
                }
              />
            </section>

            {/* 상품류 선택 섹션 */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">상품류 선택</h2>
                <p className="mt-1 text-sm text-slate-400">
                  복수 선택이 가능합니다. 주요 상품/서비스류를 모두 선택해 주세요.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {productClassGroups.map((group) => (
                  <fieldset key={group.label} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4">
                    <legend className="text-sm font-semibold text-slate-100">{group.label}</legend>
                    {group.options.map((option) => {
                      const checked = formData.productClasses.includes(option);
                      return (
                        <label key={option} className="flex cursor-pointer items-center gap-3 text-sm text-slate-200">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border border-white/20 bg-slate-900 text-pink-400 focus:ring-pink-400"
                            checked={checked}
                            onChange={(event) => {
                              const isChecked = event.target.checked;
                              setFormData((data) => ({
                                ...data,
                                productClasses: isChecked
                                  ? [...data.productClasses, option]
                                  : data.productClasses.filter((item) => item !== option),
                              }));
                            }}
                          />
                          <span>{option}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </div>
            </section>

            {/* 담당자 이메일 섹션 */}
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">담당자 이메일</h2>
                <p className="mt-1 text-sm text-slate-400">
                  상표 등록 관련 안내를 받으실 이메일 주소를 입력해 주세요.
                </p>
              </div>
              <input
                id="representativeEmail"
                type="email"
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
                placeholder="example@company.com"
                value={formData.representativeEmail}
                onChange={(event) =>
                  setFormData((data) => ({
                    ...data,
                    representativeEmail: event.target.value,
                  }))
                }
              />
            </section>

            {/* 동의 체크박스 */}
            <section>
              <label className="flex items-start gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border border-white/20 bg-slate-900 text-pink-400 focus:ring-pink-400"
                  checked={formData.agreeToTerms}
                  onChange={(event) =>
                    setFormData((data) => ({
                      ...data,
                      agreeToTerms: event.target.checked,
                    }))
                  }
                />
                <span>
                  입력한 정보가 오픈상표 담당자에게 전달되어 상표 진단 및 상담을 진행하는 데 동의합니다.
                </span>
              </label>
            </section>

            {errors.length > 0 && (
              <div className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <p className="font-semibold">확인이 필요한 항목이 있습니다.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-12 py-3 text-base font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "제출 중..." : "상표 등록 상담 신청"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function validateForm(data: TrademarkApplication) {
  const formErrors: string[] = [];

  if (!data.brandName.trim()) {
    formErrors.push("상표명을 입력해 주세요.");
  }

  if (data.productClasses.length === 0) {
    formErrors.push("최소 한 개 이상의 상품류를 선택해 주세요.");
  }

  if (!data.representativeEmail.trim()) {
    formErrors.push("담당자 이메일을 입력해 주세요.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.representativeEmail)) {
    formErrors.push("담당자 이메일 형식이 올바르지 않습니다.");
  }

  if (!data.agreeToTerms) {
    formErrors.push("정보 전달 및 상담 진행에 동의해 주세요.");
  }

  return {
    valid: formErrors.length === 0,
    errors: formErrors,
  };
}
