import crypto from "node:crypto";

import { ApiError } from "@/lib/api/errors";

type TossRequestOptions = {
  method?: string;
  body?: Record<string, unknown> | string;
  timeoutMs?: number;
};

type FetchOptions = {
  method: string;
  headers: Headers;
  body?: string;
  cache: RequestCache;
  next: { revalidate: number };
};

const DEFAULT_TIMEOUT = 10_000;

async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new ApiError("Toss Payments 응답이 지연되고 있습니다.", { status: 504 }));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function getApiBaseUrl() {
  return process.env.TOSS_PAYMENTS_API_BASE_URL ?? "https://api.tosspayments.com";
}

function getSecretKey() {
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
  if (!secretKey) {
    throw new ApiError("Toss Payments Secret Key가 설정되어 있지 않습니다.", { status: 500 });
  }
  return secretKey;
}

function buildHeaders(secretKey: string): Headers {
  const headers = new Headers();
  const encoded = Buffer.from(`${secretKey}:`, "utf-8").toString("base64");
  headers.set("Authorization", `Basic ${encoded}`);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");
  return headers;
}

export async function callTossApi<T = unknown>(path: string, options: TossRequestOptions = {}): Promise<T> {
  const secretKey = getSecretKey();
  const headers = buildHeaders(secretKey);
  const method = options.method ?? "POST";
  const body = typeof options.body === "string" ? options.body : JSON.stringify(options.body ?? {});
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
  const fetchOptions: FetchOptions = {
    method,
    headers,
    body,
    cache: "no-store",
    next: { revalidate: 0 },
  };

  const request = fetch(`${getApiBaseUrl()}${path}`, fetchOptions).then(async (response) => {
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    if (!response.ok) {
      throw new ApiError("Toss Payments 요청이 실패했습니다.", {
        status: response.status,
        details: parsed,
        expose: response.status < 500,
      });
    }

    return parsed as T;
  });

  return executeWithTimeout(request, timeoutMs);
}

export function verifyTossWebhookSignature(signature: string | null, rawBody: string) {
  const webhookSecret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new ApiError("Webhook 검증 키가 설정되어 있지 않습니다.", { status: 500 });
  }

  if (!signature) {
    throw new ApiError("유효하지 않은 서명입니다.", { status: 400, code: "missing_signature" });
  }

  const computed = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("base64");
  const received = Buffer.from(signature);
  const expected = Buffer.from(computed);

  if (received.length !== expected.length) {
    throw new ApiError("서명 검증에 실패했습니다.", { status: 400, code: "invalid_signature" });
  }

  if (!crypto.timingSafeEqual(received, expected)) {
    throw new ApiError("서명 검증에 실패했습니다.", { status: 400, code: "invalid_signature" });
  }
}
