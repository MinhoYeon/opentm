"use client";

import {
  FormEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

import { useTossPayments } from "./useTossPayments";

type PaymentMethod = "CARD" | "BANK_TRANSFER";

type BannerState = {
  type: "success" | "error" | "info";
  message: string;
};

export interface BankAccountGuide {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  guideMessage?: string;
}

export interface PaymentModalProps {
  open: boolean;
  onClose?: () => void;
  orderId: string;
  orderName: string;
  amount: number;
  customerName: string;
  customerEmail?: string;
  clientKey: string;
  successUrl?: string;
  failUrl?: string;
  prepareEndpoint?: string;
  confirmEndpoint: string;
  bankAccount: BankAccountGuide;
  onSubmitBankTransfer?: (payload: {
    depositorName: string;
    scheduledDate: string;
  }) => Promise<void> | void;
  preventBackdropClose?: boolean;
  preventEscapeClose?: boolean;
}

const DEFAULT_PREPARE_ENDPOINT = "/api/payments/toss/prepare";

export const PaymentModal = ({
  open,
  onClose,
  orderId,
  orderName,
  amount,
  customerName,
  customerEmail,
  clientKey,
  successUrl,
  failUrl,
  prepareEndpoint = DEFAULT_PREPARE_ENDPOINT,
  confirmEndpoint,
  bankAccount,
  onSubmitBankTransfer,
  preventBackdropClose = true,
  preventEscapeClose = true,
}: PaymentModalProps) => {
  const [activeMethod, setActiveMethod] = useState<PaymentMethod>("CARD");
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankTransferLoading, setBankTransferLoading] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [depositorName, setDepositorName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const bankTransferFormId = useId();

  const {
    tossPayments,
    status: sdkStatus,
    error: sdkError,
    isLoading: isSdkLoading,
  } = useTossPayments(clientKey, { enabled: open });

  useEffect(() => {
    if (!open) {
      setActiveMethod("CARD");
      setBanner(null);
      setIsProcessing(false);
      setBankTransferLoading(false);
      setDepositorName("");
      setScheduledDate("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || preventEscapeClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, preventEscapeClose, onClose]);

  const formattedAmount = useMemo(
    () => new Intl.NumberFormat("ko-KR").format(amount),
    [amount],
  );

  const handleBackdropClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (preventBackdropClose) return;
      if (event.target === event.currentTarget) {
        onClose?.();
      }
    },
    [onClose, preventBackdropClose],
  );

  const showBanner = useCallback((nextBanner: BannerState | null) => {
    setBanner(nextBanner);
  }, []);

  const handleCardPayment = useCallback(async () => {
    if (!tossPayments) {
      showBanner({
        type: "error",
        message: "결제 모듈 초기화 중입니다. 잠시 후 다시 시도해주세요.",
      });
      return;
    }

    setIsProcessing(true);
    showBanner(null);

    try {
      const prepareResponse = await fetch(prepareEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          orderName,
          amount,
          customerName,
          customerEmail,
        }),
      });

      if (!prepareResponse.ok) {
        throw new Error("결제 준비 요청에 실패했습니다.");
      }

      const preparePayload = (await prepareResponse.json()) as Record<string, unknown>;

      const {
        amount: preparedAmount,
        orderId: preparedOrderId,
        orderName: preparedOrderName,
        successUrl: preparedSuccessUrl,
        failUrl: preparedFailUrl,
        customerName: preparedCustomerName,
        customerEmail: preparedCustomerEmail,
        ...restPayload
      } = preparePayload;

      const extraPayload =
        typeof restPayload === "object" && restPayload !== null
          ? (restPayload as Record<string, unknown>)
          : {};

      const requestPayload: Record<string, unknown> = {
        amount: preparedAmount ?? amount,
        orderId: preparedOrderId ?? orderId,
        orderName: preparedOrderName ?? orderName,
        customerName: preparedCustomerName ?? customerName,
        customerEmail: preparedCustomerEmail ?? customerEmail,
        ...extraPayload,
      };

      if ((preparedSuccessUrl ?? successUrl) != null) {
        requestPayload.successUrl = preparedSuccessUrl ?? successUrl;
      }

      if ((preparedFailUrl ?? failUrl) != null) {
        requestPayload.failUrl = preparedFailUrl ?? failUrl;
      }

      const paymentResult = await tossPayments.requestPayment("카드", requestPayload);

      const resolvedOrderId =
        typeof requestPayload.orderId === "string" && requestPayload.orderId.length > 0
          ? requestPayload.orderId
          : orderId;

      const confirmPayload =
        paymentResult && typeof paymentResult === "object"
          ? (paymentResult as Record<string, unknown>)
          : {};

      const confirmResponse = await fetch(confirmEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: resolvedOrderId,
          ...confirmPayload,
        }),
      });

      if (!confirmResponse.ok) {
        throw new Error("결제 승인 확인에 실패했습니다.");
      }

      showBanner({
        type: "success",
        message: "결제가 완료되었습니다. 감사합니다!",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "결제 처리 중 오류가 발생했습니다.";

      showBanner({
        type: "error",
        message,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    tossPayments,
    showBanner,
    prepareEndpoint,
    orderId,
    orderName,
    amount,
    customerName,
    customerEmail,
    successUrl,
    failUrl,
    confirmEndpoint,
  ]);

  const handleBankTransferSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!depositorName || !scheduledDate) {
        showBanner({
          type: "error",
          message: "입금자명과 입금 예정일을 모두 입력해주세요.",
        });
        return;
      }

      setBankTransferLoading(true);
      showBanner(null);

      try {
        await onSubmitBankTransfer?.({
          depositorName,
          scheduledDate,
        });

        showBanner({
          type: "success",
          message: "입금 확인 요청이 접수되었습니다. 영업일 기준 1일 이내 안내드릴게요.",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "입금 확인 요청 처리 중 오류가 발생했습니다.";

        showBanner({
          type: "error",
          message,
        });
      } finally {
        setBankTransferLoading(false);
      }
    },
    [depositorName, scheduledDate, onSubmitBankTransfer, showBanner],
  );

  const copyAccountNumber = useCallback(async () => {
    try {
      if (!navigator.clipboard) {
        throw new Error("클립보드 기능을 사용할 수 없는 브라우저입니다.");
      }

      await navigator.clipboard.writeText(bankAccount.accountNumber);
      showBanner({
        type: "info",
        message: "계좌번호가 복사되었습니다.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "계좌번호 복사에 실패했습니다.";

      showBanner({
        type: "error",
        message,
      });
    }
  }, [bankAccount.accountNumber, showBanner]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/70 px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
    >
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 px-8 py-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-indigo-500">결제 진행</p>
            <h2 className="text-2xl font-semibold text-slate-900">주문 결제</h2>
            <p className="text-sm text-slate-500">
              주문번호 {orderId} / 결제금액 {formattedAmount}원
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-slate-200 px-4 py-2 text-sm">
            {isSdkLoading && (
              <>
                <span className="h-2 w-2 animate-ping rounded-full bg-indigo-500" aria-hidden />
                <span className="text-indigo-500">결제 모듈 로딩 중</span>
              </>
            )}
            {sdkStatus === "ready" && (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                <span className="text-emerald-600">모듈 준비 완료</span>
              </>
            )}
            {sdkStatus === "error" && (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden />
                <span className="text-rose-600">
                  {sdkError?.message ?? "모듈 로딩 실패"}
                </span>
              </>
            )}
          </div>
        </header>

        {banner && (
          <div
            className={`mx-8 mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
              banner.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : banner.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-indigo-200 bg-indigo-50 text-indigo-700"
            }`}
            role="alert"
          >
            {banner.message}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-6 inline-flex rounded-full bg-slate-100 p-1 text-xs font-medium text-slate-500">
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                activeMethod === "CARD"
                  ? "bg-white text-slate-900 shadow"
                  : "hover:text-slate-900"
              }`}
              onClick={() => setActiveMethod("CARD")}
            >
              카드 결제
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 transition ${
                activeMethod === "BANK_TRANSFER"
                  ? "bg-white text-slate-900 shadow"
                  : "hover:text-slate-900"
              }`}
              onClick={() => setActiveMethod("BANK_TRANSFER")}
            >
              무통장 입금
            </button>
          </div>

          {activeMethod === "CARD" ? (
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-base font-semibold text-slate-900">결제 요약</h3>
                <dl className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <dt>주문명</dt>
                    <dd className="font-medium text-slate-900">{orderName}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>주문자</dt>
                    <dd>{customerName}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt>결제 금액</dt>
                    <dd className="text-lg font-semibold text-slate-900">
                      {formattedAmount}원
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-6 text-sm leading-relaxed text-indigo-900">
                안전한 결제를 위해 Toss Payments와 연동되어 결제가 진행됩니다. 결제 완료 후에는 발송된 이메일 또는 마이페이지에서 영수증을 확인하실 수 있습니다.
              </div>
            </section>
          ) : (
            <section className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="text-base font-semibold text-slate-900">입금 계좌 안내</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {bankAccount.guideMessage ?? "입금 확인 후 서비스가 활성화됩니다. 영업일 기준 1일 소요될 수 있습니다."}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-white p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {bankAccount.bankName} {bankAccount.accountNumber}
                    </p>
                    <p className="text-xs text-slate-500">예금주: {bankAccount.accountHolder}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    계좌번호 복사
                  </button>
                </div>
              </div>
              <form
                id={bankTransferFormId}
                className="space-y-5"
                onSubmit={handleBankTransferSubmit}
              >
                <div className="space-y-2">
                  <label htmlFor={`${bankTransferFormId}-depositor`} className="text-sm font-medium text-slate-700">
                    입금자명
                  </label>
                  <input
                    id={`${bankTransferFormId}-depositor`}
                    type="text"
                    required
                    value={depositorName}
                    onChange={(event) => setDepositorName(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="입금 시 기재될 이름"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor={`${bankTransferFormId}-date`} className="text-sm font-medium text-slate-700">
                    입금 예정일
                  </label>
                  <input
                    id={`${bankTransferFormId}-date`}
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(event) => setScheduledDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  보내주신 정보로 입금 확인을 진행하며, 확인 즉시 이메일 또는 문자로 안내드립니다.
                </p>
              </form>
            </section>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            결제 관련 문의는 고객센터(help@opentm.kr)로 연락해주세요.
          </p>
          {activeMethod === "CARD" ? (
            <button
              type="button"
              onClick={handleCardPayment}
              disabled={isProcessing || sdkStatus !== "ready"}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-400/40 transition enabled:hover:bg-indigo-500 enabled:focus-visible:outline enabled:focus-visible:outline-2 enabled:focus-visible:outline-offset-2 enabled:focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isProcessing ? "결제 요청 중..." : "카드로 결제하기"}
            </button>
          ) : (
            <button
              type="submit"
              form={bankTransferFormId}
              disabled={bankTransferLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {bankTransferLoading ? "요청 전송 중..." : "입금 확인 요청 보내기"}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PaymentModal;
