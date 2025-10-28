import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabaseAdminClient";

/**
 * GET /api/admin/trademark-requests
 * 관리자가 trademark_requests 목록 조회
 */
export async function GET(request: NextRequest) {
  await requireAdminContext();

  const adminClient = createAdminClient();
  const params = request.nextUrl.searchParams;

  const page = Math.max(Number.parseInt(params.get("page") ?? "1", 10) || 1, 1);
  const pageSize = Math.min(Number.parseInt(params.get("pageSize") ?? "25", 10) || 25, 100);
  const offset = (page - 1) * pageSize;
  const limit = offset + pageSize - 1;

  const status = params.get("status") ?? undefined;
  const search = params.get("search")?.trim() ?? undefined;

  let query = adminClient
    .from("trademark_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, limit);

  if (status) {
    query = query.eq("status", status);
  }

  if (search) {
    const like = `%${search.replace(/%/g, "").replace(/_/g, "")}%`;
    query = query.or(`brand_name.ilike.${like},representative_email.ilike.${like}`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    page,
    pageSize,
  });
}
