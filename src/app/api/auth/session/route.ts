import { NextResponse } from "next/server";
import type { Session } from "@supabase/supabase-js";

import { getSupabaseAuthCookieNames } from "@/lib/supabaseServerClient";

function encodeSessionCookie(session: Session) {
  const payload = {
    currentSession: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at ?? null,
    },
    expiresAt: session.expires_at ?? null,
  };
  return `base64-${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
}

function resolveMaxAge(expiresAt: number | null | undefined) {
  if (!expiresAt) {
    return undefined;
  }
  const now = Math.floor(Date.now() / 1000);
  const delta = expiresAt - now;
  return delta > 0 ? delta : 0;
}

type AuthWebhookPayload = {
  event?: string;
  session?: Session | null;
};

const isProduction = process.env.NODE_ENV === "production";

const isProduction = process.env.NODE_ENV === "production";

function isSecureCookieContext(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",").some((proto) => proto.trim() === "https");
  }

  try {
    const { protocol } = new URL(request.url);
    if (protocol === "https:") {
      return true;
    }
  } catch {
    // ignore malformed URLs and fall back to environment
  }

  return process.env.NODE_ENV === "production";
}

function applySessionCookies(response: NextResponse, session: Session, request: Request) {
  const [baseCookie, refreshCookie] = getSupabaseAuthCookieNames();
  const maxAge = resolveMaxAge(session.expires_at);
  const secure = isSecureCookieContext(request);
  response.cookies.set({
    name: baseCookie,
    value: encodeSessionCookie(session),
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge,
  });
  response.cookies.set({
    name: refreshCookie,
    value: session.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge,
  });
}

function clearSessionCookies(response: NextResponse, request: Request) {
  const secure = isSecureCookieContext(request);
  for (const name of getSupabaseAuthCookieNames()) {
    response.cookies.set({
      name,
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });
  }
}

export async function POST(request: Request) {
  let payload: AuthWebhookPayload;
  try {
    payload = (await request.json()) as AuthWebhookPayload;
  } catch (error) {
    return NextResponse.json({ ok: false, error: "잘못된 JSON 본문입니다." }, { status: 400 });
  }

  if (!payload.event) {
    return NextResponse.json({ ok: false, error: "event 값이 필요합니다." }, { status: 400 });
  }

  switch (payload.event) {
    case "SIGNED_IN":
    case "TOKEN_REFRESHED": {
      if (!payload.session) {
        return NextResponse.json({ ok: false, error: "세션 정보가 필요합니다." }, { status: 400 });
      }
      const response = NextResponse.json(
        { ok: true, session: { user: payload.session.user } },
        { status: 200 }
      );
      applySessionCookies(response, payload.session, request);
      return response;
    }
    case "SIGNED_OUT": {
      const response = NextResponse.json({ ok: true }, { status: 200 });
      clearSessionCookies(response, request);
      return response;
    }
    default: {
      return NextResponse.json(
        { ok: false, error: `지원하지 않는 이벤트입니다: ${payload.event}` },
        { status: 400 }
      );
    }
  }
}
