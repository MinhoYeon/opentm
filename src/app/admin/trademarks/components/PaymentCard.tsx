"use client";

import { useState } from "react";
import type { TrademarkPayment, PaymentStatus } from "@/types/trademark";
import { getPaymentStatusLabel, getPaymentStageLabel } from "@/types/trademark";

type PaymentCardProps = {
  payment: TrademarkPayment | null;
  applicationId: string;
  onUpdate: () => void;
};

function classNames(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PaymentCard({ payment, applicationId, onUpdate }: PaymentCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [amount, setAmount] = useState(payment?.amount?.toString() || "");
  const [paidAmount, setPaidAmount] = useState(payment?.paidAmount?.toString() || "0");
  const [remitterName, setRemitterName] = useState(payment?.remitterName || "");

  if (!payment) {
    return null;
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return `${value.toLocaleString()}원`;
  };

  const getStatusColor = (status: PaymentStatus) => {
    const colors: Record<PaymentStatus, string> = {
      not_requested: "bg-gray-100 text-gray-700",
      quote_sent: "bg-blue-100 text-blue-700",
      unpaid: "bg-amber-100 text-amber-700",
      partial: "bg-yellow-100 text-yellow-700",
      paid: "bg-emerald-100 text-emerald-700",
      overdue: "bg-rose-100 text-rose-700",
      refund_requested: "bg-orange-100 text-orange-700",
      refunded: "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const handleUpdateStatus = async (newStatus: PaymentStatus) => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newStatus }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Failed to update payment");
      }

      alert(`결제 상태가 "${getPaymentStatusLabel(newStatus)}"(으)로 변경되었습니다.`);
      onUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update payment";
      alert(`오류: ${message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (isUpdating) return;

    const parsedAmount = Number.parseFloat(paidAmount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("입금 금액을 입력해주세요.");
      return;
    }

    if (!remitterName.trim()) {
      alert("입금자명을 입력해주세요.");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "paid",
          paidAmount: parsedAmount,
          remitterName: remitterName.trim(),
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Failed to confirm payment");
      }

      alert("입금이 확인되었습니다.");
      setShowAmountInput(false);
      onUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to confirm payment";
      alert(`오류: ${message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCreatePayment = async () => {
    if (isUpdating) return;

    const parsedAmount = Number.parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("청구 금액을 입력해주세요.");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          paymentStage: payment.paymentStage,
          amount: parsedAmount,
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json.error || "Failed to create payment");
      }

      alert("결제 레코드가 생성되었습니다.");
      onUpdate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create payment";
      alert(`오류: ${message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const isOverdue = payment.dueAt && new Date(payment.dueAt) < new Date() && payment.paymentStatus !== "paid";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          {getPaymentStageLabel(payment.paymentStage)}
        </h3>
        <span className={classNames("rounded-full px-3 py-1 text-xs font-medium", getStatusColor(payment.paymentStatus))}>
          {getPaymentStatusLabel(payment.paymentStatus)}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">청구 금액</span>
          <span className="font-medium text-slate-900">{formatCurrency(payment.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">입금 금액</span>
          <span className="font-medium text-slate-900">{formatCurrency(payment.paidAmount)}</span>
        </div>
        {payment.remitterName && (
          <div className="flex justify-between">
            <span className="text-slate-600">입금자명</span>
            <span className="font-medium text-slate-900">{payment.remitterName}</span>
          </div>
        )}
        {payment.dueAt && (
          <div className="flex justify-between">
            <span className="text-slate-600">납부 기한</span>
            <span className={classNames("font-medium", isOverdue ? "text-rose-600" : "text-slate-900")}>
              {new Date(payment.dueAt).toLocaleDateString("ko-KR")}
              {isOverdue && " (연체)"}
            </span>
          </div>
        )}
        {payment.paidAt && (
          <div className="flex justify-between">
            <span className="text-slate-600">입금 확인일</span>
            <span className="font-medium text-slate-900">
              {new Date(payment.paidAt).toLocaleDateString("ko-KR")}
            </span>
          </div>
        )}
      </div>

      {payment.paymentStatus !== "paid" && payment.paymentStatus !== "refunded" && (
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
          {!showAmountInput ? (
            <div className="flex gap-2">
              {payment.paymentStatus === "not_requested" && (
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("quote_sent")}
                  disabled={isUpdating}
                  className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-100 disabled:opacity-50"
                >
                  견적서 발송
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAmountInput(true)}
                disabled={isUpdating}
                className="flex-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                입금 확인
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="number"
                placeholder="입금 금액"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <input
                type="text"
                placeholder="입금자명"
                value={remitterName}
                onChange={(e) => setRemitterName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAmountInput(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={isUpdating}
                  className="flex-1 rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  확인
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {payment.notes && (
        <div className="mt-3 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
          {payment.notes}
        </div>
      )}
    </div>
  );
}
