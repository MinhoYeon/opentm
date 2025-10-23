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

export async function createBankConfirmationRequest(params: BankConfirmationParams) {
  const { data: intent, error: intentError } = await adminClient
    .from("payment_intents")
    .select("id")
    .eq("order_id", params.orderId)
    .maybeSingle();

  if (intentError) {
    throw new ApiError("결제 정보를 조회하지 못했습니다.", { status: 500, details: intentError.message });
  }

  if (!intent) {
    throw new ApiError("결제 요청을 찾을 수 없습니다.", { status: 404 });
  }

  const { error } = await adminClient.from("bank_transfer_confirmations").insert({
    intent_id: intent.id,
    user_id: params.userId,
    note: params.note ?? null,
  });

  if (error) {
    throw new ApiError("무통장입금 확인 요청을 기록하지 못했습니다.", { status: 500, details: error.message });
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
}
