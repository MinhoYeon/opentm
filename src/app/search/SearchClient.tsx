"use client";

import { useCallback, useMemo, useState, FormEvent } from "react";

type SearchResult = {
  markName: string;
  applicationNumber?: string;
  applicationDate?: string;
  status?: string;
  applicantName?: string;
  classes?: string[];
  similarMarks?: string[];
};

type ApiResponse = {
  results?: SearchResult[];
  count?: number;
  error?: string;
};

const classificationOptions = [
  { code: "01", label: "01류 - 화학제품" },
  { code: "09", label: "09류 - 과학기기" },
  { code: "25", label: "25류 - 의류" },
  { code: "30", label: "30류 - 식품" },
  { code: "35", label: "35류 - 광고/비즈니스" },
  { code: "41", label: "41류 - 교육/엔터테인먼트" },
];

function toggleSelection(current: string[], code: string): string[] {
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
    if (selectedClassifications.length === 0) {
      return "전체";
    }
    return selectedClassifications
      .map((code) => classificationOptions.find((option) => option.code === code)?.label || code)
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
        setError("상표명을 입력해주세요.");
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/trademark-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query,
            classifications: selectedClassifications,
          }),
        });

        const data: ApiResponse = await response.json();

        if (!response.ok) {
          setError(data.error || "검색에 실패했습니다.");
          setResults([]);
          return;
        }

        setResults(data.results ?? []);
      } catch (fetchError) {
        console.error(fetchError);
        setError("검색 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
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
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">상표명 선검색</h1>
        <p className="text-base text-slate-600 sm:text-lg">
          원하는 상표명을 입력하면 KIPRIS 공공 데이터를 기반으로 유사 상표, 출원번호, 심사 상태를 빠르게 확인할 수 있습니다.
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="예) 진정상표"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoComplete="off"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">국제 분류 (선택)</legend>
            <p className="text-sm text-slate-500">
              주요 분류를 선택하면 해당 분류에 속한 상표만 선별해 보여드립니다. 선택하지 않으면 모든 분류를 검색합니다.
            </p>
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
            <p className="text-sm text-slate-500">현재 선택: {selectedLabel}</p>
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
              검색 결과를 검토한 후, <a href="/register" className="font-medium text-indigo-600 underline">상표 등록 신청</a> 페이지로 이동해 출원을 이어가세요.
            </p>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold text-slate-900">검색 결과</h2>
          <p className="text-sm text-slate-500">
            유사 상표를 참고하여 충돌 가능성을 확인하고, 필요한 경우 전문가 상담을 예약해 주세요.
          </p>
        </header>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && !error && hasSubmitted && results.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            선택한 조건에 해당하는 선행 상표가 없거나 제한적으로 제공되고 있습니다. 상표명 구성을 조금 변경하거나 다른 분류를 선택해 다시 검색해 보세요.
          </div>
        ) : null}

        <div className="space-y-4">
          {results.map((result, index) => (
            <article
              key={`${result.applicationNumber ?? result.markName}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-semibold text-slate-900">{result.markName}</h3>
                {result.status ? (
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
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
                {result.applicantName ? (
                  <div>
                    <dt className="font-medium text-slate-500">출원인</dt>
                    <dd>{result.applicantName}</dd>
                  </div>
                ) : null}
                {result.classes && result.classes.length > 0 ? (
                  <div>
                    <dt className="font-medium text-slate-500">분류</dt>
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
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
