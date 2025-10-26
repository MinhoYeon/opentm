import { NextResponse } from "next/server";
import type { Session } from "@supabase/supabase-js";

import { createServerClient } from "@/lib/supabaseServerClient";

type AuthWebhookPayload = {
  event?: string;
  session?: Session | null;
};

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

  // Create a mutable Supabase client that can set cookies
  const supabase = createServerClient("mutable");

  switch (payload.event) {
    case "INITIAL_SESSION":
    case "SIGNED_IN":
    case "TOKEN_REFRESHED":
    case "USER_UPDATED":
    case "MFA_CHALLENGE_VERIFIED": {
      if (!payload.session) {
        // For these events, if there's no session, just acknowledge without error
        // This can happen during certain auth flows
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      // Use Supabase SSR library to set the session, which will automatically
      // set the cookies in the correct format
      const { error } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });

      if (error) {
        console.error("[API /auth/session] Failed to set session:", error);
        return NextResponse.json(
          { ok: false, error: "세션 설정에 실패했습니다." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { ok: true, session: { user: payload.session.user } },
        { status: 200 }
      );
    }
    case "SIGNED_OUT": {
      // Clear the session using Supabase SSR library
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    case "PASSWORD_RECOVERY":
    default: {
      // For PASSWORD_RECOVERY and any other events, just acknowledge without error
      // These events may not require session synchronization
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  }
}
