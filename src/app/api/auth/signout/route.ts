import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient, getSupabaseAuthCookieNames } from "@/lib/supabaseServerClient";

function isSecureCookieContext(): boolean {
  const forwardedProto = headers().get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",").some((proto) => proto.trim() === "https");
  }

  return process.env.NODE_ENV === "production";
}

export async function POST() {
  const supabase = createServerClient("mutable");
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const response = NextResponse.json({ ok: true }, { status: 200 });
  const secure = isSecureCookieContext();
  for (const name of getSupabaseAuthCookieNames()) {
    response.cookies.set({
      name,
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
    });
  }
  return response;
}

