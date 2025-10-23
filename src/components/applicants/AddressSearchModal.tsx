"use client";

import { useEffect, useMemo, useState } from "react";

type AddressResult = {
  address: string;
  roadAddress?: string | null;
  x?: number | null;
  y?: number | null;
};

type AddressSearchModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (result: AddressResult) => void;
  initialQuery?: string;
};

type SearchState = {
  query: string;
  results: AddressResult[];
  loading: boolean;
  error: string | null;
};

let loaderPromise: Promise<void> | null = null;

function loadNaverMap(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.naver?.maps) {
    return Promise.resolve();
  }
  if (!loaderPromise) {
    loaderPromise = new Promise((resolve, reject) => {
      const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
      if (!clientId) {
        console.warn("NAVER MAP client ID is not configured. Falling back to manual input.");
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("네이버 지도를 불러오지 못했습니다."));
      document.body.appendChild(script);
    });
  }
  return loaderPromise;
}

declare global {
  interface Window {
    naver?: {
      maps?: {
        Service?: {
          Geocoder: new () => {
            addressSearch(
              query: string,
              callback: (
                result: Array<{ roadAddress: string; jibunAddress: string; x: string; y: string }> | null,
                status: string
              ) => void
            ): void;
          };
        };
      };
    };
  }
}

export function AddressSearchModal({ open, onClose, onSelect, initialQuery }: AddressSearchModalProps) {
  const [state, setState] = useState<SearchState>({
    query: initialQuery ?? "",
    results: [],
    loading: false,
    error: null,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadNaverMap()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setReady(true);
          setState((prev) => ({ ...prev, error: "주소 검색 스크립트를 불러오지 못했습니다." }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setState((prev) => ({ ...prev, query: initialQuery ?? "" }));
    }
  }, [open, initialQuery]);

  const hasResults = state.results.length > 0;

  const overlayClass = useMemo(
    () =>
      `fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 transition ${
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
      }`,
    [open]
  );

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.query.trim()) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const geocoder = window.naver?.maps?.Service ? new window.naver.maps.Service.Geocoder() : null;

    if (!geocoder) {
      setState((prev) => ({
        ...prev,
        loading: false,
        results: [
          {
            address: state.query.trim(),
            roadAddress: state.query.trim(),
          },
        ],
        error: "지도 서비스를 사용할 수 없어 입력값을 그대로 사용합니다.",
      }));
      return;
    }

    geocoder.addressSearch(state.query.trim(), (result, status) => {
      if (status !== "OK" || !result || result.length === 0) {
        setState((prev) => ({
          ...prev,
          loading: false,
          results: [],
          error: "검색 결과가 없습니다.",
        }));
        return;
      }
      setState({
        query: state.query,
        loading: false,
        error: null,
        results: result.map((item) => ({
          address: item.jibunAddress || item.roadAddress,
          roadAddress: item.roadAddress,
          x: item.x ? Number.parseFloat(item.x) : null,
          y: item.y ? Number.parseFloat(item.y) : null,
        })),
      });
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div className={overlayClass} role="dialog" aria-modal="true">
      <div className="mx-4 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">주소 검색</h3>
          <button type="button" className="text-sm text-slate-500 hover:underline" onClick={onClose}>
            닫기
          </button>
        </div>
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            value={state.query}
            onChange={(event) => setState((prev) => ({ ...prev, query: event.target.value }))}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            placeholder="도로명 또는 지번 주소를 입력"
            disabled={!ready}
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!ready || state.loading}
          >
            {state.loading ? "검색 중..." : "검색"}
          </button>
        </form>
        {state.error ? <p className="mt-2 text-sm text-rose-500">{state.error}</p> : null}
        <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          {hasResults ? (
            <ul className="divide-y divide-slate-200">
              {state.results.map((item, index) => (
                <li key={`${item.address}-${index}`} className="p-3">
                  <p className="text-sm font-medium text-slate-900">{item.roadAddress ?? item.address}</p>
                  {item.address ? <p className="text-xs text-slate-500">지번: {item.address}</p> : null}
                  <button
                    type="button"
                    className="mt-2 rounded-full border border-indigo-500 px-3 py-1 text-xs font-medium text-indigo-600"
                    onClick={() => onSelect(item)}
                  >
                    이 주소 사용
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-sm text-slate-500">검색 결과가 없습니다. 다른 키워드를 입력해 보세요.</p>
          )}
        </div>
      </div>
    </div>
  );
}
