"use server";

import crypto from "node:crypto";

import { env } from "@/config/env";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import { logger } from "@/server/lib/logger";

export const TOSS_SIGNATURE_HEADER = "Toss-Signature";

export interface TossWebhookPayment {
  readonly orderId: string;
  readonly paymentKey: string;
  readonly status: string;
  readonly method?: string;
  readonly [key: string]: unknown;
}

export interface TossWebhookPayload {
  readonly eventId: string;
  readonly eventType: string;
  readonly payment: TossWebhookPayment;
  readonly [key: string]: unknown;
}

function getHmacDigest(body: string): Buffer {
  const secret = env.toss.webhookSecret;
  const digest = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return Buffer.from(digest, "base64");
}

export function verifyTossSignature(
  signature: string | null | undefined,
  body: string
): boolean {
  if (!signature) {
    return false;
  }

  try {
    const sanitizedSignature = signature.trim();
    const provided = Buffer.from(sanitizedSignature, "base64");
    const expected = getHmacDigest(body);

    if (provided.length === 0 || expected.length === 0) {
      return false;
    }

    if (provided.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(provided, expected);
  } catch (error) {
    logger.warn("Failed to verify Toss signature", {
      event: "payments.toss.signature",
      error,
    });
    return false;
  }
}

function assertPayload(payload: unknown): asserts payload is TossWebhookPayload {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("Toss webhook payload must be an object");
  }

  const record = payload as Record<string, unknown>;
  const eventId = record.eventId;
  const eventType = record.eventType;
  const payment = record.payment;

  if (typeof eventId !== "string" || eventId.length === 0) {
    throw new Error("Toss webhook payload is missing eventId");
  }

  if (typeof eventType !== "string" || eventType.length === 0) {
    throw new Error("Toss webhook payload is missing eventType");
  }

  if (typeof payment !== "object" || payment === null) {
    throw new Error("Toss webhook payload is missing payment details");
  }

  const paymentRecord = payment as Record<string, unknown>;
  const orderId = paymentRecord.orderId;
  const paymentKey = paymentRecord.paymentKey;
  const status = paymentRecord.status;

  if (typeof orderId !== "string" || orderId.length === 0) {
    throw new Error("Toss webhook payload is missing payment.orderId");
  }

  if (typeof paymentKey !== "string" || paymentKey.length === 0) {
    throw new Error("Toss webhook payload is missing payment.paymentKey");
  }

  if (typeof status !== "string" || status.length === 0) {
    throw new Error("Toss webhook payload is missing payment.status");
  }
}

export async function processTossWebhook(payload: unknown): Promise<boolean> {
  assertPayload(payload);

  const client = createAdminClient();
  const { eventId, eventType } = payload;
  const { orderId, paymentKey, method, status } = payload.payment;

  try {
    const { data, error } = await client.rpc("process_toss_payment_event", {
      p_event_id: eventId,
      p_event_type: eventType,
      p_order_id: orderId,
      p_payment_key: paymentKey,
      p_payment_method: method ?? null,
      p_payment_status: status,
      p_raw_payload: payload,
    });

    if (error) {
      logger.error("Supabase RPC process_toss_payment_event failed", {
        event: "payments.toss.rpc_error",
        metadata: { eventId, orderId, eventType },
        error,
      });
      throw new Error(error.message);
    }

    const processed = Boolean(data);

    if (!processed) {
      logger.info("Ignoring duplicate Toss event", {
        event: "payments.toss.duplicate_event",
        metadata: { eventId, orderId },
      });
    }

    return processed;
  } catch (error) {
    logger.error("Failed to process Toss webhook", {
      event: "payments.toss.process_failure",
      metadata: { eventId, orderId },
      error,
    });
    throw error;
  }
}
