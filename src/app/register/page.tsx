"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  trademarkType: TrademarkType | "";
  image: StoredImage | null;
  productClasses: string[];
  representativeEmail: string;
  additionalNotes: string;
  agreeToTerms: boolean;
}

const steps = [
  {
    title: "상표명 입력",
    description: "출원하고자 하는 브랜드 또는 서비스명을 정확히 입력해 주세요.",
  },
  {
    title: "상표 유형 선택 및 이미지 업로드",
    description: "워드, 도형, 복합 상표 중 유형을 고르고 시각 자료가 있다면 업로드합니다.",
  },
  {
    title: "상품류 선택",
    description: "상품 또는 서비스가 속하는 니스를 선택해 주세요.",
  },
  {
    title: "최종 확인",
    description: "제출 전 정보를 확인하고 담당자에게 전달될 이메일을 입력합니다.",
  },
] as const;

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

const storageKey = "register-wizard";

function getInitialState(): TrademarkApplication {
  if (typeof window === "undefined") {
    return {
      brandName: "",
      trademarkType: "",
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
      trademarkType: "",
      image: null,
      productClasses: [],
      representativeEmail: "",
      additionalNotes: "",
      agreeToTerms: false,
    };
  }
}

export default function RegisterPage() {
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<TrademarkApplication>(() => getInitialState());
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [submissionDetails, setSubmissionDetails] = useState<
    { id: string; link: string } | null
  >(null);

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

  const progress = useMemo(() => ((currentStep + 1) / steps.length) * 100, [currentStep]);

  const handleNext = () => {
    const validation = validateStep(currentStep, formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  };

  const handleBack = () => {
    setErrors([]);
    setCurrentStep((step) => Math.max(step - 1, 0));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateStep(currentStep, formData, true);
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
      setSubmissionMessage(null);
      setSubmissionDetails(null);
      const result = await submitTrademarkRequest({
        brandName: formData.brandName,
        trademarkType: formData.trademarkType as TrademarkType,
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
        setSubmissionMessage(result.message);
        return;
      }

      setErrors([]);
      setSubmissionDetails({ id: result.requestId, link: result.requestLink });
      setSubmissionMessage(
        `신청이 접수되었습니다. 요청 ID: ${result.requestId}`
      );
      setFormData({
        brandName: "",
        trademarkType: "",
        image: null,
        productClasses: [],
        representativeEmail: "",
        additionalNotes: "",
        agreeToTerms: false,
      });
      setCurrentStep(0);
    } catch (error) {
      setSubmissionMessage(
        error instanceof Error
          ? error.message
          : "신청 접수 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-pink-300/80">JINJUNG TRADEMARK LAB</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">상표 등록 준비 마법사</h1>
          <p className="text-sm text-slate-300 sm:text-base">
            간단한 네 단계의 흐름을 따라 상표 정보를 입력하면 담당 변리사에게 즉시 전달됩니다.
          </p>
        </header>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-purple-900/20 backdrop-blur">
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
              <span>
                Step {currentStep + 1} / {steps.length}
              </span>
              <span>{steps[currentStep].title}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ol className="mb-8 grid gap-4 text-sm text-slate-400 sm:grid-cols-4">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              return (
                <li
                  key={step.title}
                  className={`rounded-xl border px-3 py-4 transition ${
                    isActive
                      ? "border-pink-400/60 bg-pink-400/10 text-slate-100"
                      : isComplete
                      ? "border-green-400/60 bg-green-400/10 text-slate-200"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300/80">{step.description}</p>
                </li>
              );
            })}
          </ol>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {currentStep === 0 && (
              <section className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100" htmlFor="brandName">
                    상표명
                  </label>
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100" htmlFor="additionalNotes">
                    브랜드 메모 (선택)
                  </label>
                  <textarea
                    id="additionalNotes"
                    className="h-28 w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
                    placeholder="프로젝트 배경, 활용 예정 국가 등을 알려주세요."
                    value={formData.additionalNotes}
                    onChange={(event) =>
                      setFormData((data) => ({
                        ...data,
                        additionalNotes: event.target.value,
                      }))
                    }
                  />
                </div>
              </section>
            )}

            {currentStep === 1 && (
              <section className="space-y-5">
                <fieldset className="space-y-3">
                  <legend className="text-sm font-medium text-slate-100">상표 유형</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[{ value: "word", label: "워드" }, { value: "logo", label: "도형" }, { value: "combined", label: "복합" }].map(
                      (option) => {
                        const checked = formData.trademarkType === option.value;
                        return (
                          <label
                            key={option.value}
                            className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-4 py-3 text-sm transition ${
                              checked
                                ? "border-pink-400/60 bg-pink-400/10 text-white"
                                : "border-white/10 bg-white/5 text-slate-200 hover:border-pink-300/40"
                            }`}
                          >
                            <input
                              type="radio"
                              name="trademarkType"
                              value={option.value}
                              checked={checked}
                              onChange={(event) =>
                                setFormData((data) => ({
                                  ...data,
                                  trademarkType: event.target.value as TrademarkType,
                                }))
                              }
                              className="hidden"
                            />
                            <span className="text-base font-semibold">{option.label}</span>
                            <span className="text-xs text-slate-300/80">
                              {option.value === "word"
                                ? "텍스트 중심의 명칭"
                                : option.value === "logo"
                                ? "로고, 심볼 등 도형"
                                : "텍스트와 도형이 함께 있는 경우"}
                            </span>
                          </label>
                        );
                      }
                    )}
                  </div>
                </fieldset>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-100">상표 이미지 (PNG, JPG, SVG)</label>
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
                </div>
              </section>
            )}

            {currentStep === 2 && (
              <section className="space-y-4">
                <p className="text-sm text-slate-300">
                  복수 선택이 가능합니다. 주요 상품/서비스류를 모두 선택해 주세요.
                </p>
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
            )}

            {currentStep === 3 && (
              <section className="space-y-6">
                <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4 text-sm text-slate-200">
                  <h2 className="text-base font-semibold text-white">입력 정보 확인</h2>
                  <dl className="mt-4 space-y-3">
                    <div>
                      <dt className="font-medium text-slate-300">상표명</dt>
                      <dd className="text-slate-100">{formData.brandName || "-"}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-300">상표 유형</dt>
                      <dd className="text-slate-100">
                        {formData.trademarkType === "word"
                          ? "워드"
                          : formData.trademarkType === "logo"
                          ? "도형"
                          : formData.trademarkType === "combined"
                          ? "복합"
                          : "-"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-slate-300">상품류</dt>
                      <dd className="text-slate-100">
                        {formData.productClasses.length > 0 ? formData.productClasses.join(", ") : "-"}
                      </dd>
                    </div>
                    {formData.additionalNotes && (
                      <div>
                        <dt className="font-medium text-slate-300">브랜드 메모</dt>
                        <dd className="whitespace-pre-wrap text-slate-100">{formData.additionalNotes}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-100" htmlFor="representativeEmail">
                    담당자 이메일
                  </label>
                  <input
                    id="representativeEmail"
                    type="email"
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-base text-white placeholder:text-slate-500 focus:border-pink-400 focus:outline-none"
                    placeholder="대표님 또는 담당자의 이메일 주소"
                    value={formData.representativeEmail}
                    onChange={(event) =>
                      setFormData((data) => ({
                        ...data,
                        representativeEmail: event.target.value,
                      }))
                    }
                  />
                </div>

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
            )}

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

            {submissionMessage && (
              <div className="space-y-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <p>{submissionMessage}</p>
                {submissionDetails ? (
                  <p>
                    <a
                      href={submissionDetails.link}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 px-3 py-1 text-xs font-medium text-emerald-100 transition hover:border-white/70 hover:text-white"
                    >
                      요청 상세 보기
                      <span aria-hidden>→</span>
                    </a>
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-2 text-sm font-medium text-slate-200 transition hover:border-pink-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                이전 단계
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:-translate-y-0.5"
                >
                  다음 단계
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-sky-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "제출 중..." : "상표 등록 상담 신청"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function validateStep(step: number, data: TrademarkApplication, isFinalCheck = false) {
  const stepErrors: string[] = [];

  if (step === 0) {
    if (!data.brandName.trim()) {
      stepErrors.push("상표명을 입력해 주세요.");
    }
  }

  if (step === 1) {
    if (!data.trademarkType) {
      stepErrors.push("상표 유형을 선택해 주세요.");
    }
    if (!data.image) {
      stepErrors.push("상표 이미지를 업로드해 주세요.");
    }
  }

  if (step === 2) {
    if (data.productClasses.length === 0) {
      stepErrors.push("최소 한 개 이상의 상품류를 선택해 주세요.");
    }
  }

  if (step === 3 || isFinalCheck) {
    if (!data.representativeEmail.trim()) {
      stepErrors.push("담당자 이메일을 입력해 주세요.");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.representativeEmail)) {
      stepErrors.push("담당자 이메일 형식이 올바르지 않습니다.");
    }
    if (!data.agreeToTerms) {
      stepErrors.push("정보 전달 및 상담 진행에 동의해 주세요.");
    }
  }

  return {
    valid: stepErrors.length === 0,
    errors: stepErrors,
  };
}
