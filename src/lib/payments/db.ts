import { createAdminClient } from "@/lib/supabaseAdminClient";

import { ApiError } from "@/lib/api/errors";

type Json = Record<string, unknown> | null;

type UpsertIntentParams = {
  orderId: string;
  amount: number;
  currency: string;
  userId: string;
  applicationId?: string | null;
  rawRequest: Record<string, unknown>;
  rawResponse: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

type ConfirmIntentParams = {
  orderId: string;
  paymentKey: string;
  amount: number;
  confirmResponse: Record<string, unknown>;
};

type WebhookEventParams = {
  orderId: string;
  eventType: string;
  status?: string | null;
  signature?: string | null;
  payload: Record<string, unknown>;
};

type UpdateIntentStatusParams = {
  orderId: string;
  status: string;
  lastWebhookType?: string | null;
  paymentKey?: string | null;
};

type BankConfirmationParams = {
  orderId: string;
  userId: string;
  note?: string | null;
  depositorName?: string | null;
  scheduledDate?: string | null;
};

type BankTransferReviewStatus = "pending" | "confirmed" | "rejected";

type BankAccountMetadata = {
  bankName?: string | null;
  accountNumber?: string | null;
  accountHolder?: string | null;
};

type ConfirmationMetadata = {
  depositorName?: string | null;
  scheduledDate?: string | null;
  note?: string | null;
};

type BankConfirmationResult = {
  confirmationId: number;
  intentId: string;
  orderId: string;
  amount: number;
  currency: string;
  bankAccount: BankAccountMetadata;
  depositorName: string | null;
  scheduledDate: string | null;
  note: string | null;
};

export type BankTransferReview = {
  confirmationId: number;
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  status: BankTransferReviewStatus;
  paymentStatus: string;
  requestedAt: string;
  processedAt: string | null;
  processedBy: string | null;
  memo: string | null;
  note: string | null;
  depositorName: string | null;
  scheduledDate: string | null;
  bankAccount: BankAccountMetadata;
  requestedBy: string | null;
};

const adminClient = createAdminClient();

function normalizeJson(value: Record<string, unknown> | null | undefined): Json {
  if (!value) {
    return null;
  }
  return value;
}

export async function upsertPaymentIntent(params: UpsertIntentParams) {
  const checkoutUrl = (() => {
    const response = params.rawResponse;
    if (response && typeof response.checkout === 'object' && response.checkout) {
      const checkout = response.checkout as Record<string, unknown>;
      const url = checkout.url;
      if (typeof url === 'string') {
        return url;
      }
    }
    const successUrl = (params.rawResponse as Record<string, unknown> | null)?.successUrl;
    return typeof successUrl === 'string' ? successUrl : null;
  })();

  const { data, error } = await adminClient
    .from("payment_intents")
    .upsert(
      {
        order_id: params.orderId,
        amount: params.amount,
        currency: params.currency,
        user_id: params.userId,
        application_id: params.applicationId ?? null,
        raw_request: params.rawRequest,
        raw_response: normalizeJson(params.rawResponse),
        metadata: normalizeJson(params.metadata) ?? {},
        status: "prepared",
        toss_checkout_url: checkoutUrl,
      },
      { onConflict: "order_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw new ApiError("결제 정보를 저장하는 중 오류가 발생했습니다.", {
      status: 500,
      details: error.message,
    });
  }

  return data;
}

export async function confirmPaymentIntent(params: ConfirmIntentParams) {
  const { data, error } = await adminClient.rpc("confirm_payment_intent", {
    p_order_id: params.orderId,
    p_payment_key: params.paymentKey,
    p_amount: params.amount,
    p_confirm_response: params.confirmResponse,
  });

  if (error) {
    throw new ApiError("결제 확정 처리 중 오류가 발생했습니다.", {
      status: 500,
      details: error.message,
    });
  }

  return data;
}

export async function recordWebhookEvent(params: WebhookEventParams) {
  const { data: intent, error: intentError } = await adminClient
    .from("payment_intents")
    .select("id")
    .eq("order_id", params.orderId)
    .maybeSingle();

  if (intentError) {
    throw new ApiError("결제 정보를 조회하지 못했습니다.", { status: 500, details: intentError.message });
  }

  const { error: insertError } = await adminClient.from("payment_events").insert({
    intent_id: intent?.id ?? null,
    event_type: params.eventType,
    status: params.status ?? null,
    signature: params.signature ?? null,
    payload: params.payload,
  });

  if (insertError) {
    throw new ApiError("웹훅 이력을 기록하지 못했습니다.", { status: 500, details: insertError.message });
  }

  return intent?.id ?? null;
}

export async function updateIntentStatus(params: UpdateIntentStatusParams) {
  const updatePayload: Record<string, unknown> = {
    status: params.status,
    last_webhook_type: params.lastWebhookType ?? params.status,
  };

  if (params.paymentKey) {
    updatePayload.payment_key = params.paymentKey;
  }

  const { error } = await adminClient
    .from("payment_intents")
    .update(updatePayload)
    .eq("order_id", params.orderId);

  if (error) {
    throw new ApiError("결제 상태를 갱신하지 못했습니다.", { status: 500, details: error.message });
  }
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function parseBankAccount(metadata: Record<string, unknown> | null | undefined): BankAccountMetadata {
  if (!metadata || typeof metadata !== "object") {
    return { bankName: null, accountNumber: null, accountHolder: null };
  }
  const bankAccount = metadata.bankAccount;
  if (!bankAccount || typeof bankAccount !== "object") {
    return {
      bankName: typeof metadata.bankName === "string" ? metadata.bankName : null,
      accountNumber: typeof metadata.accountNumber === "string" ? metadata.accountNumber : null,
      accountHolder: typeof metadata.accountHolder === "string" ? metadata.accountHolder : null,
    };
  }
  const record = bankAccount as Record<string, unknown>;
  return {
    bankName: typeof record.bankName === "string" ? record.bankName : null,
    accountNumber: typeof record.accountNumber === "string" ? record.accountNumber : null,
    accountHolder: typeof record.accountHolder === "string" ? record.accountHolder : null,
  };
}

function parseConfirmationMetadata(metadata: Record<string, unknown> | null | undefined): ConfirmationMetadata {
  if (!metadata || typeof metadata !== "object") {
    return {};
  }
  const record = metadata as Record<string, unknown>;
  return {
    depositorName: typeof record.depositorName === "string" ? record.depositorName : null,
    scheduledDate: typeof record.scheduledDate === "string" ? record.scheduledDate : null,
    note: typeof record.note === "string" ? record.note : null,
  };
}

export async function createBankConfirmationRequest(params: BankConfirmationParams): Promise<BankConfirmationResult> {
  const { data: intent, error: intentError } = await adminClient
    .from("payment_intents")
    .select("id, order_id, amount, currency, metadata")
    .eq("order_id", params.orderId)
    .maybeSingle();

  if (intentError) {
    throw new ApiError("결제 정보를 조회하지 못했습니다.", { status: 500, details: intentError.message });
  }

  if (!intent) {
    throw new ApiError("결제 요청을 찾을 수 없습니다.", { status: 404 });
  }

  const confirmationMetadata: ConfirmationMetadata = {
    depositorName: params.depositorName ?? null,
    scheduledDate: params.scheduledDate ?? null,
    note: params.note ?? null,
  };

  const { data: confirmation, error } = await adminClient
    .from("bank_transfer_confirmations")
    .insert({
      intent_id: intent.id,
      user_id: params.userId,
      note: params.note ?? null,
      metadata: confirmationMetadata,
      status: "pending",
    })
    .select("id, metadata")
    .single();

  if (error || !confirmation) {
    throw new ApiError("무통장입금 확인 요청을 기록하지 못했습니다.", { status: 500, details: error?.message });
  }

  const { error: updateError } = await adminClient
    .from("payment_intents")
    .update({
      status: "pending_bank_transfer",
      bank_confirm_requested_at: new Date().toISOString(),
    })
    .eq("id", intent.id);

  if (updateError) {
    throw new ApiError("결제 상태를 갱신하지 못했습니다.", { status: 500, details: updateError.message });
  }

  const bankAccount = parseBankAccount((intent as Record<string, unknown>).metadata as Record<string, unknown> | null);
  const metadata = parseConfirmationMetadata(confirmation.metadata as Record<string, unknown> | null);

  return {
    confirmationId: confirmation.id,
    intentId: intent.id,
    orderId: intent.order_id,
    amount: toNumber(intent.amount),
    currency: typeof intent.currency === "string" ? intent.currency : "KRW",
    bankAccount,
    depositorName: metadata.depositorName ?? null,
    scheduledDate: metadata.scheduledDate ?? null,
    note: metadata.note ?? params.note ?? null,
  };
}

function mapConfirmationRow(row: Record<string, unknown>): BankTransferReview {
  const confirmationId = Number(row.id);
  const status = (row.status as BankTransferReviewStatus) ?? "pending";
  const memo = typeof row.memo === "string" ? row.memo : null;
  const note = typeof row.note === "string" ? row.note : null;
  const metadata = parseConfirmationMetadata(row.metadata as Record<string, unknown> | null);
  const intent = (row.intent as Record<string, unknown>) ?? {};
  const paymentId = typeof intent.id === "string" ? intent.id : "";
  const bankAccount = parseBankAccount(intent.metadata as Record<string, unknown> | null);

  return {
    confirmationId,
    paymentId,
    orderId: typeof intent.order_id === "string" ? intent.order_id : String(row.intent_id ?? ""),
    amount: toNumber(intent.amount),
    currency: typeof intent.currency === "string" ? intent.currency : "KRW",
    status,
    paymentStatus: typeof intent.status === "string" ? intent.status : "pending_bank_transfer",
    requestedAt: typeof row.requested_at === "string" ? row.requested_at : new Date().toISOString(),
    processedAt: typeof row.processed_at === "string" ? row.processed_at : null,
    processedBy: typeof row.processed_by === "string" ? row.processed_by : null,
    memo,
    note,
    depositorName: metadata.depositorName ?? null,
    scheduledDate: metadata.scheduledDate ?? null,
    bankAccount,
    requestedBy: typeof row.user_id === "string" ? row.user_id : null,
  };
}

async function fetchBankTransferReviewById(id: number): Promise<BankTransferReview | null> {
  const { data, error } = await adminClient
    .from("bank_transfer_confirmations")
    .select(
      `id, intent_id, status, note, memo, metadata, requested_at, processed_at, processed_by, user_id, intent:payment_intents(id, order_id, amount, currency, status, metadata)`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new ApiError("입금 확인 요청을 조회하지 못했습니다.", { status: 500, details: error.message });
  }

  if (!data) {
    return null;
  }

  return mapConfirmationRow(data as Record<string, unknown>);
}

type ListBankTransferOptions = {
  statuses?: BankTransferReviewStatus[];
};

export async function listBankTransferReviews(options: ListBankTransferOptions = {}): Promise<BankTransferReview[]> {
  let query = adminClient
    .from("bank_transfer_confirmations")
    .select(
      `id, intent_id, status, note, memo, metadata, requested_at, processed_at, processed_by, user_id, intent:payment_intents(id, order_id, amount, currency, status, metadata)`
    )
    .order("requested_at", { ascending: false });

  if (options.statuses?.length) {
    query = query.in("status", options.statuses);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError("입금 확인 요청 목록을 불러오지 못했습니다.", { status: 500, details: error.message });
  }

  return (data ?? []).map((row) => mapConfirmationRow(row as Record<string, unknown>));
}

type UpdateBankTransferParams = {
  confirmationId: number;
  paymentId: string;
  status: Exclude<BankTransferReviewStatus, "pending">;
  confirmedBy: string;
  memo?: string | null;
};

export async function updateBankTransferReview(params: UpdateBankTransferParams): Promise<BankTransferReview | null> {
  const nowIso = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: params.status,
    processed: params.status === "confirmed",
    processed_at: nowIso,
    processed_by: params.confirmedBy,
    memo: params.memo ?? null,
  };

  const { data: confirmationRow, error: confirmationError } = await adminClient
    .from("bank_transfer_confirmations")
    .update(updates)
    .eq("id", params.confirmationId)
    .eq("intent_id", params.paymentId)
    .select("id")
    .maybeSingle();

  if (confirmationError) {
    throw new ApiError("입금 확인 요청을 갱신하지 못했습니다.", { status: 500, details: confirmationError.message });
  }

  if (!confirmationRow) {
    return null;
  }

  const intentUpdates: Record<string, unknown> = {
    status: params.status === "confirmed" ? "confirmed" : "bank_transfer_rejected",
  };

  if (params.status === "confirmed") {
    intentUpdates.bank_confirmed_at = nowIso;
  }

  const { error: intentError } = await adminClient
    .from("payment_intents")
    .update(intentUpdates)
    .eq("id", params.paymentId);

  if (intentError) {
    throw new ApiError("결제 상태를 갱신하지 못했습니다.", { status: 500, details: intentError.message });
  }

  return fetchBankTransferReviewById(params.confirmationId);
}
