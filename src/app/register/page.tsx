"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";

import { submitTrademarkRequest, type TrademarkType } from "./actions";
import {
  BUSINESS_CATEGORIES,
  getRecommendedClasses,
  PRODUCT_CLASSES,
  type ProductClass
} from "@/data/productClassRecommendations";

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

// 사업분야별 상품류 데이터는 BUSINESS_CATEGORIES에서 가져옴

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
  const [showAllClasses, setShowAllClasses] = useState(false);

  // 선택된 상품류에 기반한 추천 상품류 계산
  const recommendedClasses = useMemo(() => {
    const selectedNumbers = formData.productClasses
      .map(cls => {
        const match = cls.match(/제(\d+)류/);
        return match ? parseInt(match[1]) : null;
      })
      .filter((num): num is number => num !== null);

    return getRecommendedClasses(selectedNumbers);
  }, [formData.productClasses]);

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
      <div className="mx-auto space-y-8">
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
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">상품류 선택</h2>
                <p className="mt-1 text-sm text-slate-400">
                  복수 선택이 가능합니다. 사업분야에 맞는 상품/서비스류를 선택해 주세요.
                </p>
              </div>

              {/* 선택된 상품류 표시 박스 */}
              {formData.productClasses.length > 0 && (
                <div className="rounded-xl border border-pink-400/50 bg-gradient-to-r from-pink-500/20 to-purple-500/20 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-pink-200">
                      선택된 상품류 ({formData.productClasses.length}개)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setFormData((data) => ({ ...data, productClasses: [] }))}
                      className="text-xs text-pink-300 hover:text-pink-100 transition"
                    >
                      전체 해제
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.productClasses.map((cls, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 rounded-lg border border-pink-300/50 bg-slate-900/60 px-3 py-1.5 text-xs text-pink-100"
                      >
                        <span>{cls}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((data) => ({
                              ...data,
                              productClasses: data.productClasses.filter((item) => item !== cls),
                            }));
                          }}
                          className="text-pink-300 hover:text-pink-100 transition"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 주요 사업분야별 상품류 */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {BUSINESS_CATEGORIES.map((category) => (
                  <fieldset key={category.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                    <legend className="text-sm font-semibold text-slate-100">{category.label}</legend>
                    <p className="text-[10px] text-slate-400 mb-2">{category.description}</p>
                    {category.primaryClasses.map((productClass) => {
                      const optionValue = `${productClass.label} (${productClass.description})`;
                      const checked = formData.productClasses.includes(optionValue);
                      return (
                        <label key={productClass.classNumber} className="flex cursor-pointer items-start gap-2 text-xs text-slate-200 hover:text-white transition">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border border-white/20 bg-slate-900 text-pink-400 focus:ring-pink-400"
                            checked={checked}
                            onChange={(event) => {
                              const isChecked = event.target.checked;
                              setFormData((data) => ({
                                ...data,
                                productClasses: isChecked
                                  ? [...data.productClasses, optionValue]
                                  : data.productClasses.filter((item) => item !== optionValue),
                              }));
                            }}
                          />
                          <span className="leading-tight">
                            {productClass.label} <span className="text-slate-400">({productClass.description})</span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                ))}
              </div>

              {/* 전체 분야 드롭다운 */}
              <div className="rounded-xl border border-white/10 bg-white/5">
                <button
                  type="button"
                  onClick={() => setShowAllClasses(!showAllClasses)}
                  className="flex w-full items-center justify-between p-4 text-left transition hover:bg-white/5"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">전체 분야</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      1류~45류 모든 상품류를 확인하고 선택할 수 있습니다
                    </p>
                  </div>
                  <svg
                    className={`h-5 w-5 text-slate-400 transition-transform ${showAllClasses ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showAllClasses && (
                  <div className="border-t border-white/10 p-4">
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {Object.values(PRODUCT_CLASSES).map((productClass) => {
                        const optionValue = `${productClass.label} (${productClass.description})`;
                        const checked = formData.productClasses.includes(optionValue);
                        return (
                          <label
                            key={productClass.classNumber}
                            className="flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white transition"
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border border-white/20 bg-slate-900 text-pink-400 focus:ring-pink-400"
                              checked={checked}
                              onChange={(event) => {
                                const isChecked = event.target.checked;
                                setFormData((data) => ({
                                  ...data,
                                  productClasses: isChecked
                                    ? [...data.productClasses, optionValue]
                                    : data.productClasses.filter((item) => item !== optionValue),
                                }));
                              }}
                            />
                            <span className="leading-tight">
                              {productClass.label} <span className="text-slate-400">({productClass.description})</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 추천 상품류 섹션 */}
              {recommendedClasses.length > 0 && (
                <div className="rounded-xl border border-pink-400/30 bg-pink-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg className="h-5 w-5 text-pink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-pink-200 mb-2">함께 선택하면 좋은 상품류</h3>
                      <p className="text-xs text-slate-300 mb-3">
                        선택하신 사업분야와 관련하여 함께 등록을 고려해보시면 좋은 상품류입니다.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {recommendedClasses.map((productClass) => {
                          const optionValue = `${productClass.label} (${productClass.description})`;
                          const isAlreadySelected = formData.productClasses.includes(optionValue);

                          if (isAlreadySelected) return null;

                          return (
                            <button
                              key={productClass.classNumber}
                              type="button"
                              onClick={() => {
                                setFormData((data) => ({
                                  ...data,
                                  productClasses: [...data.productClasses, optionValue],
                                }));
                              }}
                              className="inline-flex items-center gap-2 rounded-full border border-pink-300/50 bg-white/10 px-3 py-1.5 text-xs text-pink-100 transition hover:bg-white/20 hover:border-pink-300"
                            >
                              <span>+</span>
                              <span>{productClass.label}</span>
                              <span className="text-pink-200/70">({productClass.description})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
