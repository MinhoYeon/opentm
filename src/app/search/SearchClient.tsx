"use client";

import { useCallback, useMemo, useState, FormEvent, useEffect } from "react";
import {
  BUSINESS_CATEGORIES,
  PRODUCT_CLASSES,
} from "@/data/productClassRecommendations";

type SearchResult = {
  markName: string;
  applicationNumber?: string;
  applicationDate?: string;
  registrationNumber?: string;
  registrationDate?: string;
  status?: string;
  applicantName?: string;
  classes?: string[];
  similarMarks?: string[];
  imageUrl?: string;
};

type ApiResponse = {
  results?: SearchResult[];
  count?: number;
  error?: string;
};

interface ProductSearchResult {
  products: any[];
  generics: any[];
  hierarchy: any;
  totalCount: number;
  genericsCount?: number;
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [productClasses, setProductClasses] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [productSearchResults, setProductSearchResults] = useState<ProductSearchResult | null>(null);
  const [isProductSearching, setIsProductSearching] = useState(false);

  // 상품 검색 기능 (디바운스 적용)
  useEffect(() => {
    if (!productSearchQuery.trim()) {
      setProductSearchResults(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsProductSearching(true);
      try {
        const response = await fetch(
          `/api/products/search?q=${encodeURIComponent(productSearchQuery.trim())}`
        );
        if (response.ok) {
          const data = await response.json();
          setProductSearchResults(data);
        }
      } catch (error) {
        console.error("Product search failed:", error);
      } finally {
        setIsProductSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [productSearchQuery]);

  // 검색 결과에서 상품류 빠르게 선택
  const addClassFromSearch = (classNumber: number, description: string) => {
    const productClass = PRODUCT_CLASSES[classNumber];
    if (!productClass) return;

    const optionValue = `${productClass.label} (${description})`;
    if (!productClasses.includes(optionValue)) {
      setProductClasses((prev) => [...prev, optionValue]);
    }
    // 검색 초기화
    setProductSearchQuery("");
    setProductSearchResults(null);
  };

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setHasSubmitted(true);

      if (!query.trim()) {
        setError("상표명을 입력해 주세요.");
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        // 상품류 번호만 추출 (제N류 형식에서 숫자만)
        const classNumbers = productClasses
          .map((cls) => {
            const match = cls.match(/제(\d+)류/);
            return match ? match[1] : null;
          })
          .filter((n): n is string => n !== null);

        const response = await fetch("/api/trademark-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, classifications: classNumbers }),
        });
        const data: ApiResponse = await response.json();
        if (!response.ok) {
          setError(data.error || "검색에 실패했습니다.");
          setResults([]);
          return;
        }
        setResults(data.results ?? []);
      } catch (e) {
        console.error(e);
        setError("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [query, productClasses]
  );

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">상표 무료 조회</h1>
        <p className="text-base text-slate-600 sm:text-lg">
          상표명을 입력하면 KIPRIS 공공데이터를 기반으로 유사 상표, 출원/등록 상태를 확인할 수 있습니다.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="trademark" className="block text-sm font-medium text-slate-700">
              상표명
            </label>
            <input
              id="trademark"
              name="trademark"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 오픈상표"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="off"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">상품류(선택)</label>
              <p className="mt-1 text-sm text-slate-500">
                복수 선택이 가능합니다. 사업분야에 맞는 상품/서비스류를 선택해 주세요.
              </p>
            </div>

            {/* 상품 검색 박스 */}
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="상품명으로 검색 (예: 커피, 신발, 소프트웨어)"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {isProductSearching && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
                  </div>
                )}
                {productSearchQuery && !isProductSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setProductSearchQuery("");
                      setProductSearchResults(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* 검색 결과 */}
              {productSearchResults && productSearchResults.totalCount > 0 && (
                <div className="mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4 shadow-lg">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-indigo-600">
                      검색 결과: {productSearchResults.totalCount}개 상품
                      {productSearchResults.genericsCount && productSearchResults.genericsCount > 0 && ` (${productSearchResults.genericsCount}개 카테고리)`}
                    </h3>
                    <span className="text-xs text-slate-500">
                      클릭하여 상품류 선택
                    </span>
                  </div>
                  <div className="space-y-2">
                    {productSearchResults.generics.slice(0, 10).map((generic: any) => (
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
                  {productSearchResults.totalCount > 10 && (
                    <p className="mt-3 text-center text-xs text-slate-500">
                      더 많은 결과가 있습니다. 검색어를 더 구체적으로 입력해보세요.
                    </p>
                  )}
                </div>
              )}

              {productSearchResults && productSearchResults.totalCount === 0 && (
                <div className="mt-2 rounded-xl border border-slate-300 bg-white p-4 text-center">
                  <p className="text-sm text-slate-600">
                    검색 결과가 없습니다. 다른 키워드로 검색해보세요.
                  </p>
                </div>
              )}
            </div>

            {/* 선택된 상품류 표시 박스 */}
            {productClasses.length > 0 && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-indigo-900">
                    선택된 상품류 ({productClasses.length}개)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setProductClasses([])}
                    className="text-xs text-indigo-600 hover:text-indigo-800 transition"
                  >
                    전체 해제
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {productClasses.map((cls, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs text-indigo-900"
                    >
                      <span>{cls}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setProductClasses((prev) => prev.filter((item) => item !== cls));
                        }}
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
                <fieldset key={category.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                  <legend className="text-sm font-semibold text-slate-900">{category.label}</legend>
                  <p className="text-[10px] text-slate-500 mb-2">{category.description}</p>
                  {category.primaryClasses.map((productClass) => {
                    const optionValue = `${productClass.label} (${productClass.description})`;
                    const checked = productClasses.includes(optionValue);
                    return (
                      <label key={productClass.classNumber} className="flex cursor-pointer items-start gap-2 text-xs text-slate-700 hover:text-slate-900 transition">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={checked}
                          onChange={(event) => {
                            const isChecked = event.target.checked;
                            setProductClasses((prev) =>
                              isChecked
                                ? [...prev, optionValue]
                                : prev.filter((item) => item !== optionValue)
                            );
                          }}
                        />
                        <span className="leading-tight">
                          {productClass.label} <span className="text-slate-500">({productClass.description})</span>
                        </span>
                      </label>
                    );
                  })}
                </fieldset>
              ))}
            </div>

            {/* 전체 분야 드롭다운 */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => setShowAllClasses(!showAllClasses)}
                className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">전체 분야</h3>
                  <p className="text-xs text-slate-500 mt-1">
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
                      const checked = productClasses.includes(optionValue);
                      return (
                        <label
                          key={productClass.classNumber}
                          className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={checked}
                            onChange={(event) => {
                              const isChecked = event.target.checked;
                              setProductClasses((prev) =>
                                isChecked
                                  ? [...prev, optionValue]
                                  : prev.filter((item) => item !== optionValue)
                              );
                            }}
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
          </div>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? "검색 중..." : "상표 검색"}
            </button>
            <p className="text-sm text-slate-500">
              검색 결과가 적합하면 <a href="/register" className="font-medium text-indigo-600 underline">상표 출원 신청</a>으로 이동해 보세요.
            </p>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">검색 결과</h2>
          <p className="text-sm text-slate-500">유사 상표를 참고하여 충돌 가능성을 확인해 주세요.</p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && hasSubmitted && results.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            조건에 해당하는 진행 중 상표가 없거나, 공고되지 않았을 수 있습니다. 검색 조건을 조정해 보세요.
          </div>
        ) : null}

        <div className="space-y-4">
          {results.map((result, index) => (
            <article
              key={`${result.applicationNumber ?? result.markName}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {result.imageUrl ? (
                  <img
                    src={result.imageUrl}
                    alt={result.markName}
                    className="h-20 w-20 flex-none rounded-lg border border-slate-200 bg-white object-contain"
                    loading="lazy"
                  />
                ) : null}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xl font-semibold text-slate-900">{result.markName}</h3>
                    {result.status ? (
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
                        {result.status}
                      </span>
                    ) : null}
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                    {result.applicationNumber ? (
                      <div>
                        <dt className="font-medium text-slate-500">출원번호</dt>
                        <dd>{result.applicationNumber}</dd>
                      </div>
                    ) : null}
                    {result.applicationDate ? (
                      <div>
                        <dt className="font-medium text-slate-500">출원일</dt>
                        <dd>{result.applicationDate}</dd>
                      </div>
                    ) : null}
                    {result.registrationNumber ? (
                      <div>
                        <dt className="font-medium text-slate-500">등록번호</dt>
                        <dd>{result.registrationNumber}</dd>
                      </div>
                    ) : null}
                    {result.registrationDate ? (
                      <div>
                        <dt className="font-medium text-slate-500">등록일</dt>
                        <dd>{result.registrationDate}</dd>
                      </div>
                    ) : null}
                    {result.applicantName ? (
                      <div>
                        <dt className="font-medium text-slate-500">출원인</dt>
                        <dd>{result.applicantName}</dd>
                      </div>
                    ) : null}
                    {result.classes && result.classes.length > 0 ? (
                      <div>
                        <dt className="font-medium text-slate-500">상품류</dt>
                        <dd>{result.classes.join(", ")}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {result.similarMarks && result.similarMarks.length > 0 ? (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-slate-500">유사군 코드 / 유사 상표</h4>
                      <p className="mt-1 text-sm text-slate-600">{result.similarMarks.join(", ")}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

