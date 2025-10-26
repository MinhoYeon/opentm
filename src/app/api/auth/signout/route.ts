import { NextResponse } from "next/server";
import { createServerClient, getSupabaseAuthCookieNames } from "@/lib/supabaseServerClient";

export async function POST() {
  const supabase = createServerClient("mutable");
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const response = NextResponse.json({ ok: true }, { status: 200 });
  for (const name of getSupabaseAuthCookieNames()) {
    response.cookies.set({
      name,
      value: "",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
  }
  return response;
}

