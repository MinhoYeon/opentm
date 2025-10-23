import { useEffect, useMemo, useState } from "react";

const TOSS_SDK_URL = "https://js.tosspayments.com/v1";

export type TossPaymentsInstance = {
  requestPayment: (method: string, request: Record<string, unknown>) => Promise<unknown>;
};

export type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

type UseTossPaymentsStatus = "idle" | "loading" | "ready" | "error";

export interface UseTossPaymentsOptions {
  enabled?: boolean;
}

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
    __tossPaymentsScriptPromise__?: Promise<void>;
  }
}

const loadTossPaymentsScript = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("TossPayments SDK는 브라우저 환경에서만 로드할 수 있습니다."));
  }

  if (window.__tossPaymentsScriptPromise__) {
    return window.__tossPaymentsScriptPromise__;
  }

  window.__tossPaymentsScriptPromise__ = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TOSS_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("TossPayments SDK 로드에 실패했습니다."));

    document.head.appendChild(script);
  });

  return window.__tossPaymentsScriptPromise__;
};

export const useTossPayments = (
  clientKey: string | null | undefined,
  options: UseTossPaymentsOptions = {}
) => {
  const [status, setStatus] = useState<UseTossPaymentsStatus>("idle");
  const [error, setError] = useState<Error | null>(null);
  const [instance, setInstance] = useState<TossPaymentsInstance | null>(null);

  useEffect(() => {
    const enabled = options.enabled ?? true;

    if (!clientKey || !enabled) {
      setInstance(null);
      setStatus("idle");
      return;
    }

    let isCancelled = false;

    setStatus("loading");
    setError(null);

    loadTossPaymentsScript()
      .then(() => {
        if (isCancelled) return;

        if (typeof window.TossPayments !== "function") {
          throw new Error("TossPayments SDK를 찾을 수 없습니다.");
        }

        const tossPayments = window.TossPayments(clientKey);
        setInstance(tossPayments);
        setStatus("ready");
      })
      .catch((sdkError) => {
        if (isCancelled) return;

        setInstance(null);
        setStatus("error");
        setError(
          sdkError instanceof Error
            ? sdkError
            : new Error("TossPayments SDK 초기화 중 알 수 없는 오류가 발생했습니다."),
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [clientKey, options.enabled]);

  return useMemo(
    () => ({
      status,
      error,
      tossPayments: instance,
      isLoading: status === "loading",
      isReady: status === "ready",
      isError: status === "error",
    }),
    [status, error, instance],
  );
};

export type UseTossPaymentsReturn = ReturnType<typeof useTossPayments>;
