import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabaseServerClient";

export async function POST() {
  const supabase = createServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}

