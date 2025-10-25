"use client";

import { useCallback, useMemo, useState, FormEvent } from "react";

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

const classificationOptions = [
  { code: "01", label: "01류 - 화학제품" },
  { code: "03", label: "03류 - 화장품" },
  { code: "09", label: "09류 - 과학기기" },
  { code: "21", label: "21류 - 가정용기구" },
  { code: "25", label: "25류 - 의류" },
  { code: "30", label: "30류 - 식품" },
  { code: "35", label: "35류 - 광고/비즈니스" },
  { code: "41", label: "41류 - 교육/엔터테인먼트" },
];

export function toggleSelection(current: string[], code: string): string[] {
  return current.includes(code)
    ? current.filter((value) => value !== code)
    : [...current, code];
}

export default function SearchClient() {
  const [query, setQuery] = useState("");
  const [selectedClassifications, setSelectedClassifications] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const selectedLabel = useMemo(() => {
    if (selectedClassifications.length === 0) return "전체";
    return selectedClassifications
      .map((code) => classificationOptions.find((o) => o.code === code)?.label || code)
      .join(", ");
  }, [selectedClassifications]);

  const handleToggle = useCallback((code: string) => {
    setSelectedClassifications((current) => toggleSelection(current, code));
  }, []);

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
        const response = await fetch("/api/trademark-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, classifications: selectedClassifications }),
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
    [query, selectedClassifications]
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

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">상품류(선택)</legend>
            <p className="text-sm text-slate-500">현재 선택: {selectedLabel}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {classificationOptions.map((option) => {
                const checked = selectedClassifications.includes(option.code);
                return (
                  <label
                    key={option.code}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition ${
                      checked
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={checked}
                      onChange={() => handleToggle(option.code)}
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

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

