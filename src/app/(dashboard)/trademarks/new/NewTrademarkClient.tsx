"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { UploadedImage } from "./components/TrademarkImageUploader";
import { TrademarkImageUploader } from "./components/TrademarkImageUploader";
import { useCreateTrademarkRequest } from "./useCreateTrademarkRequest";
import type { Applicant } from "@/components/applicants/useApplicantSelection";
import {
  BUSINESS_CATEGORIES,
  getRecommendedClasses,
  PRODUCT_CLASSES,
} from "@/data/productClassRecommendations";

const TRADEMARK_TYPES = [
  { value: "word", label: "워드 상표" },
  { value: "design", label: "도형 상표" },
  { value: "combined", label: "복합 상표" },
] as const;

// 사업분야별 상품류 데이터는 BUSINESS_CATEGORIES에서 가져옴

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
  selectedApplicantIds: string[];
};

const initialFormState = (userEmail?: string | null): FormState => ({
  brandName: "",
  trademarkType: "",
  productClasses: [],
  representativeEmail: userEmail ?? "",
  additionalNotes: "",
  image: null,
  selectedApplicantIds: [],
});

interface SearchResult {
  products: any[];
  generics: any[];
  hierarchy: any;
  totalCount: number;
  genericsCount: number;
}

interface RecommendedProduct {
  순번: number;
  국문명칭: string;
  상품류: number;
  유사군코드: string;
  영문명칭: string;
  _score?: number;
  childrenCount: number;
  reason: string;
  relevance: number;
}

export function NewTrademarkClient({ userId, userEmail }: NewTrademarkClientProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => initialFormState(userEmail));
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<RecommendedProduct[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const { isSubmitting, error, submit, reset } = useCreateTrademarkRequest();

  // Fetch applicants when modal opens
  useEffect(() => {
    if (showApplicantModal && applicants.length === 0) {
      setIsLoadingApplicants(true);
      fetch("/api/applicants?limit=50")
        .then((res) => res.json())
        .then((data) => {
          if (data.items) {
            setApplicants(data.items);
          }
        })
        .catch((err) => console.error("Failed to fetch applicants:", err))
        .finally(() => setIsLoadingApplicants(false));
    }
  }, [showApplicantModal, applicants.length]);

  // 상품 검색 기능 (디바운스 적용)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/products/search?q=${encodeURIComponent(searchQuery.trim())}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 검색 결과에서 상품류 빠르게 선택
  const addClassFromSearch = (classNumber: number, description: string) => {
    const productClass = PRODUCT_CLASSES[classNumber];
    if (!productClass) return;

    const optionValue = `${productClass.label} (${description})`;
    if (!form.productClasses.includes(optionValue)) {
      setForm((prev) => ({
        ...prev,
        productClasses: [...prev.productClasses, optionValue],
      }));
    }
    // 검색 초기화
    setSearchQuery("");
    setSearchResults(null);
  };

  // AI 추천 기능 (상품류 선택 시)
  useEffect(() => {
    const selectedNumbers = form.productClasses
      .map((cls) => {
        const match = cls.match(/제(\d+)류/);
        return match ? parseInt(match[1]) : null;
      })
      .filter((n): n is number => n !== null);

    if (selectedNumbers.length === 0) {
      setAiRecommendations([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingRecommendations(true);
      try {
        const response = await fetch(
          `/api/products/recommend?classes=${selectedNumbers.join(",")}`
        );
        if (response.ok) {
          const data = await response.json();
          setAiRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error("Failed to load recommendations:", error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    }, 800); // 800ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [form.productClasses]);

  // 추천에서 상품류 빠르게 선택
  const addClassFromRecommendation = (recommendation: RecommendedProduct) => {
    const productClass = PRODUCT_CLASSES[recommendation.상품류];
    if (!productClass) return;

    const optionValue = `${productClass.label} (${recommendation.국문명칭})`;
    if (!form.productClasses.includes(optionValue)) {
      setForm((prev) => ({
        ...prev,
        productClasses: [...prev.productClasses, optionValue],
      }));
    }
  };

  const isFormValid = useMemo(() => {
    return Boolean(form.brandName.trim() && form.trademarkType && form.representativeEmail.trim());
  }, [form.brandName, form.trademarkType, form.representativeEmail]);

  // 선택된 상품류에 기반한 추천 상품류 계산
  const recommendedClasses = useMemo(() => {
    const selectedNumbers = form.productClasses
      .map(cls => {
        const match = cls.match(/제(\d+)류/);
        return match ? parseInt(match[1]) : null;
      })
      .filter((num): num is number => num !== null);

    return getRecommendedClasses(selectedNumbers);
  }, [form.productClasses]);

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

  const toggleApplicant = (applicantId: string) => {
    setForm((prev) => {
      const exists = prev.selectedApplicantIds.includes(applicantId);
      return {
        ...prev,
        selectedApplicantIds: exists
          ? prev.selectedApplicantIds.filter((id) => id !== applicantId)
          : [...prev.selectedApplicantIds, applicantId],
      };
    });
  };

  const selectedApplicants = useMemo(() => {
    return applicants.filter((app) => form.selectedApplicantIds.includes(app.id));
  }, [applicants, form.selectedApplicantIds]);

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

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">상품류 선택</h2>
        <p className="text-sm text-slate-600">
          출원하고자 하는 상품 또는 서비스의 클래스를 선택해 주세요. 사업분야에 맞는 상품류를 선택할 수 있습니다.
        </p>

        {/* 상품 검색 박스 */}
        <div className="relative">
          <div className="relative">
            <input
              type="text"
              placeholder="상품명으로 검색 (예: 커피, 신발, 소프트웨어)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
              </div>
            )}
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* 검색 결과 */}
          {searchResults && searchResults.totalCount > 0 && (
            <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-indigo-900">
                  검색 결과: {searchResults.totalCount}개 상품
                  {searchResults.genericsCount > 0 && ` (${searchResults.genericsCount}개 카테고리)`}
                </h3>
                <span className="text-xs text-slate-500">
                  클릭하여 상품류 선택
                </span>
              </div>
              <div className="space-y-2">
                {searchResults.generics.slice(0, 10).map((generic: any) => (
                  <button
                    key={generic.순번}
                    type="button"
                    onClick={() => addClassFromSearch(generic.상품류, generic.국문명칭)}
                    className="group w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-400 hover:bg-indigo-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-indigo-600">
                            제{generic.상품류}류
                          </span>
                          <span className="font-medium text-slate-900">
                            {generic.국문명칭}
                          </span>
                          {generic._score && (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                              인기
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {generic.영문명칭}
                        </p>
                        {generic.childrenCount > 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            관련 상품 {generic.childrenCount}개 포함
                          </p>
                        )}
                      </div>
                      <span className="text-indigo-600 opacity-0 transition group-hover:opacity-100">
                        +
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              {searchResults.totalCount > 10 && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  더 많은 결과가 있습니다. 검색어를 더 구체적으로 입력해보세요.
                </p>
              )}
            </div>
          )}

          {searchResults && searchResults.totalCount === 0 && (
            <div className="mt-2 rounded-xl border border-slate-300 bg-white p-4 text-center">
              <p className="text-sm text-slate-600">
                검색 결과가 없습니다. 다른 키워드로 검색해보세요.
              </p>
            </div>
          )}
        </div>

        {/* 선택된 상품류 표시 박스 */}
        {form.productClasses.length > 0 && (
          <div className="rounded-2xl border border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-indigo-900">
                선택된 상품류 ({form.productClasses.length}개)
              </h3>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, productClasses: [] }))}
                className="text-xs text-indigo-600 hover:text-indigo-800 transition"
              >
                전체 해제
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.productClasses.map((cls, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs text-indigo-900"
                >
                  <span>{cls}</span>
                  <button
                    type="button"
                    onClick={() => toggleClass(cls)}
                    className="text-indigo-600 hover:text-indigo-800 transition"
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
            <fieldset key={category.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <legend className="text-sm font-semibold text-slate-800">{category.label}</legend>
              <p className="text-[10px] text-slate-500 mb-2">{category.description}</p>
              <div className="mt-3 space-y-2">
                {category.primaryClasses.map((productClass) => {
                  const optionValue = `${productClass.label} (${productClass.description})`;
                  const checked = form.productClasses.includes(optionValue);
                  return (
                    <label key={productClass.classNumber} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900 transition">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(optionValue)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="leading-tight">
                        {productClass.label} <span className="text-slate-500">({productClass.description})</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>

        {/* 전체 분야 드롭다운 */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setShowAllClasses(!showAllClasses)}
            className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-800">전체 분야</h3>
              <p className="text-xs text-slate-600 mt-1">
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
            <div className="border-t border-slate-200 p-4">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Object.values(PRODUCT_CLASSES).map((productClass) => {
                  const optionValue = `${productClass.label} (${productClass.description})`;
                  const checked = form.productClasses.includes(optionValue);
                  return (
                    <label
                      key={productClass.classNumber}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(optionValue)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="leading-tight">
                        {productClass.label} <span className="text-slate-500">({productClass.description})</span>
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
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2">함께 선택하면 좋은 상품류</h3>
                <p className="text-xs text-slate-700 mb-3">
                  선택하신 사업분야와 관련하여 함께 등록을 고려해보시면 좋은 상품류입니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendedClasses.map((productClass) => {
                    const optionValue = `${productClass.label} (${productClass.description})`;
                    const isAlreadySelected = form.productClasses.includes(optionValue);

                    if (isAlreadySelected) return null;

                    return (
                      <button
                        key={productClass.classNumber}
                        type="button"
                        onClick={() => toggleClass(optionValue)}
                        className="inline-flex items-center gap-2 rounded-full border border-indigo-300 bg-white px-3 py-1.5 text-xs text-indigo-700 transition hover:bg-indigo-100"
                      >
                        <span>+</span>
                        <span>{productClass.label}</span>
                        <span className="text-slate-600">({productClass.description})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI 추천 상품 섹션 - 임시 비활성화 */}
        {false && aiRecommendations.length > 0 && (
          <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-purple-900">AI 맞춤 추천</h3>
                  {isLoadingRecommendations && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
                  )}
                </div>
                <p className="text-xs text-slate-700 mb-3">
                  선택하신 상품을 분석하여 관련성 높은 상품류를 추천해드립니다.
                </p>
                <div className="space-y-2">
                  {aiRecommendations.slice(0, 8).map((recommendation) => {
                    const productClass = PRODUCT_CLASSES[recommendation.상품류];
                    const optionValue = `${productClass?.label || `제${recommendation.상품류}류`} (${recommendation.국문명칭})`;
                    const isAlreadySelected = form.productClasses.includes(optionValue);

                    if (isAlreadySelected) return null;

                    return (
                      <button
                        key={recommendation.순번}
                        type="button"
                        onClick={() => addClassFromRecommendation(recommendation)}
                        className="group w-full rounded-lg border border-purple-200 bg-white p-3 text-left transition hover:bg-purple-50 hover:border-purple-300"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-purple-600 text-sm">
                                제{recommendation.상품류}류
                              </span>
                              <span className="font-medium text-slate-900 text-sm">
                                {recommendation.국문명칭}
                              </span>
                              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                                {recommendation.relevance}% 관련
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mb-1">
                              {recommendation.영문명칭}
                            </p>
                            <p className="text-xs text-slate-500">
                              {recommendation.reason}
                              {recommendation.childrenCount > 0 && ` · ${recommendation.childrenCount}개 상품 포함`}
                            </p>
                          </div>
                          <span className="text-purple-600 opacity-0 transition group-hover:opacity-100">
                            +
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">출원인 정보</h2>
          <button
            type="button"
            onClick={() => setShowApplicantModal(true)}
            className="rounded-full border border-indigo-500 bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            출원인 선택
          </button>
        </div>
        <p className="text-sm text-slate-600">
          상표를 출원할 출원인을 선택해 주세요. 여러 명의 출원인을 선택할 수 있습니다.
        </p>
        {selectedApplicants.length > 0 ? (
          <div className="space-y-2">
            {selectedApplicants.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {app.nameKorean || app.name || "-"}
                    </p>
                    <p className="text-sm text-slate-500">{app.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleApplicant(app.id)}
                    className="text-sm text-rose-600 hover:underline"
                  >
                    제거
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-center text-sm text-slate-600">
              선택된 출원인이 없습니다. &quot;출원인 선택&quot; 버튼을 눌러 출원인을 선택해 주세요.
            </p>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">담당자 연락처</h2>
        <p className="text-sm text-slate-600">
          상표 등록 관련 안내를 받으실 이메일 주소입니다. 기본값으로 회원가입 시 사용한 이메일이 자동 입력되며, 필요시 수정하실 수 있습니다.
        </p>
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

      {/* Applicant Selection Modal */}
      {showApplicantModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowApplicantModal(false)}
        >
          <div
            className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-slate-900">출원인 선택</h3>
              <button
                type="button"
                onClick={() => setShowApplicantModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="mb-4 text-sm text-slate-600">
              출원인을 선택하거나{" "}
              <a href="/mypage/applicants/new" className="text-indigo-600 hover:underline">
                새 출원인을 등록
              </a>
              해 주세요.
            </p>

            {isLoadingApplicants ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-600">불러오는 중...</p>
              </div>
            ) : applicants.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-600">
                  등록된 출원인이 없습니다.{" "}
                  <a href="/mypage/applicants/new" className="text-indigo-600 hover:underline">
                    새 출원인을 등록
                  </a>
                  해 주세요.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {applicants.map((app) => {
                  const isSelected = form.selectedApplicantIds.includes(app.id);
                  return (
                    <div
                      key={app.id}
                      className={`cursor-pointer rounded-xl border px-4 py-3 transition ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                      onClick={() => toggleApplicant(app.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">
                            {app.nameKorean || app.name || "-"}
                          </p>
                          <p className="text-sm text-slate-500">{app.email}</p>
                        </div>
                        {isSelected && (
                          <span className="rounded-full bg-indigo-600 px-2 py-1 text-xs font-medium text-white">
                            선택됨
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApplicantModal(false)}
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
