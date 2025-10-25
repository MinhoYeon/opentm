import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.0";

import { STATUS_NOTIFICATION_TEMPLATES, getStatusMetadata } from "../../../src/lib/status.ts";
import { TRADEMARK_STATUS_VALUES } from "../../../src/types/status.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PORTAL_URL = Deno.env.get("STATUS_PORTAL_URL") ?? "https://app.opentm.kr/mypage";
const OPS_EMAIL = Deno.env.get("STATUS_NOTIFIER_OPS_EMAIL");

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "notifications@opentm.kr";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");
const TWILIO_FROM_NUMBER = Deno.env.get("TWILIO_FROM_NUMBER");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type StatusEventPayload = {
  logId: number;
  applicationId: string;
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  changedBy?: string | null;
  changedAt: string;
  application: {
    id: string;
    requestId: string | null;
    userId: string | null;
    managementNumber: string;
    brandName: string;
    status: string;
    statusDetail: string | null;
    statusUpdatedAt: string;
  };
};

type NotificationResult = {
  channel: "email" | "sms" | "ops-email";
  target?: string;
  success: boolean;
  attempts: number;
  error?: string;
};

type ProfileRecord = {
  email: string | null;
  phone: string | null;
  name: string | null;
};

async function fetchProfile(userId: string | null): Promise<ProfileRecord | null> {
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("email, phone, name")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    email: typeof data.email === "string" ? data.email : null,
    phone: typeof data.phone === "string" ? data.phone : null,
    name: typeof data.name === "string" ? data.name : null,
  };
}

async function fetchUserEmail(userId: string | null): Promise<string | null> {
  if (!userId) {
    return null;
  }

  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch (error) {
    console.error("Failed to fetch auth user", error);
    return null;
  }
}

function renderTemplate(template: string | undefined, context: Record<string, string>): string | undefined {
  if (!template) {
    return undefined;
  }

  return template.replace(/{{(\w+)}}/g, (_, key: string) => context[key] ?? "");
}

function toHtml(body: string | undefined): string | undefined {
  if (!body) {
    return undefined;
  }

  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>");
}

async function retry<T>(operation: () => Promise<T>, options: { attempts?: number; baseDelayMs?: number } = {}): Promise<{
  result?: T;
  attempts: number;
  error?: unknown;
}> {
  const attempts = options.attempts ?? 3;
  const baseDelay = options.baseDelayMs ?? 400;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const result = await operation();
      return { result, attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }

      const delay = baseDelay * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { attempts, error: lastError };
}

async function sendResendEmail(to: string, subject: string, body: string): Promise<Response> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html: toHtml(body) ?? body,
      text: body,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Resend request failed: ${response.status} ${text}`);
  }

  return response;
}

async function sendTwilioSms(to: string, body: string): Promise<Response> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are not configured");
  }

  if (!TWILIO_MESSAGING_SERVICE_SID && !TWILIO_FROM_NUMBER) {
    throw new Error("Twilio messaging service SID or from number must be provided");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const params = new URLSearchParams({
    Body: body,
    To: to,
  });

  if (TWILIO_MESSAGING_SERVICE_SID) {
    params.append("MessagingServiceSid", TWILIO_MESSAGING_SERVICE_SID);
  } else if (TWILIO_FROM_NUMBER) {
    params.append("From", TWILIO_FROM_NUMBER);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Twilio request failed: ${response.status} ${text}`);
  }

  return response;
}

function buildTemplateContext(payload: StatusEventPayload, profile: ProfileRecord | null) {
  const metadata = getStatusMetadata(payload.toStatus);
  const detail = payload.application.statusDetail ?? "";

  return {
    brandName: payload.application.brandName,
    managementNumber: payload.application.managementNumber ?? "",
    status: payload.toStatus,
    statusLabel: metadata.label,
    statusHelpText: metadata.helpText,
    statusDetail: detail,
    portalUrl: PORTAL_URL,
    changedAt: payload.changedAt,
    displayName: profile?.name ?? payload.application.brandName,
  } satisfies Record<string, string>;
}

function isKnownStatus(value: string): boolean {
  return (TRADEMARK_STATUS_VALUES as readonly string[]).includes(value);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: StatusEventPayload;

  try {
    payload = (await request.json()) as StatusEventPayload;
  } catch (error) {
    console.error("Invalid JSON payload", error);
    return new Response("Invalid JSON", { status: 400 });
  }

  const toStatus = payload.toStatus?.trim().toLowerCase();
  if (!toStatus || !isKnownStatus(toStatus)) {
    return new Response("Unsupported status", { status: 422 });
  }

  const profile = await fetchProfile(payload.application.userId);
  const userEmail = await fetchUserEmail(payload.application.userId);
  const recipientEmail = profile?.email ?? userEmail;
  const recipientPhone = profile?.phone ?? null;

  const template = STATUS_NOTIFICATION_TEMPLATES[toStatus];
  const context = buildTemplateContext(payload, profile);

  const results: NotificationResult[] = [];

  if (template.channels.includes("email")) {
    if (recipientEmail && RESEND_API_KEY) {
      const subject = renderTemplate(template.emailSubject, context) ?? "상태 알림";
      const body = renderTemplate(template.emailBody, context) ?? "";

      const { attempts, error } = await retry(() => sendResendEmail(recipientEmail, subject, body));
      results.push({
        channel: "email",
        target: recipientEmail,
        success: !error,
        attempts,
        error: error instanceof Error ? error.message : undefined,
      });
    } else {
      results.push({
        channel: "email",
        target: recipientEmail ?? undefined,
        success: false,
        attempts: 0,
        error: RESEND_API_KEY ? "recipient-email-missing" : "resend-not-configured",
      });
    }
  }

  if (template.channels.includes("sms")) {
    if (recipientPhone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && (TWILIO_MESSAGING_SERVICE_SID || TWILIO_FROM_NUMBER)) {
      const smsBody = renderTemplate(template.smsBody, context) ?? "";
      const { attempts, error } = await retry(() => sendTwilioSms(recipientPhone, smsBody));
      results.push({
        channel: "sms",
        target: recipientPhone,
        success: !error,
        attempts,
        error: error instanceof Error ? error.message : undefined,
      });
    } else {
      results.push({
        channel: "sms",
        target: recipientPhone ?? undefined,
        success: false,
        attempts: 0,
        error: TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
          ? "sms-target-or-config-missing"
          : "twilio-not-configured",
      });
    }
  }

  if (template.escalateToOps && OPS_EMAIL && RESEND_API_KEY) {
    const opsSubject = `[Ops] 상태 알림 (${context.statusLabel}) - ${context.brandName}`;
    const opsBody = [
      `상태: ${context.statusLabel} (${context.status})`,
      `브랜드명: ${context.brandName}`,
      `관리번호: ${context.managementNumber}`,
      `변경시각: ${context.changedAt}`,
      `메모: ${payload.note ?? "-"}`,
      `상세: ${context.statusDetail || "-"}`,
      `링크: ${PORTAL_URL}`,
    ].join("\n");

    const { attempts, error } = await retry(() => sendResendEmail(OPS_EMAIL, opsSubject, opsBody));
    results.push({
      channel: "ops-email",
      target: OPS_EMAIL,
      success: !error,
      attempts,
      error: error instanceof Error ? error.message : undefined,
    });
  }

  const hasSuccess = results.some((entry) => entry.success);
  const hasFailure = results.some((entry) => !entry.success && entry.channel !== "ops-email");

  const status = hasFailure && !hasSuccess ? 500 : 200;

  return new Response(JSON.stringify({ ok: hasSuccess, results }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
});
