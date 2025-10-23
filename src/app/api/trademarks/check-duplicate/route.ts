import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabaseAdminClient";
import { createServerClient } from "@/lib/supabase/server";

function normalizeBrandName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function parseClasses(params: URLSearchParams): string[] {
  const classes: string[] = [];
  const append = (input: string | null) => {
    if (!input) return;
    for (const token of input.split(/[;,\s]+/)) {
      const trimmed = token.trim();
      if (trimmed && !classes.includes(trimmed)) {
        classes.push(trimmed);
      }
    }
  };

  for (const value of params.getAll("class")) {
    append(value);
  }
  append(params.get("classes"));

  return classes;
}

export async function GET(request: NextRequest) {
  const serverClient = createServerClient();
  const {
    data: { session },
    error: sessionError,
  } = await serverClient.auth.getSession();

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const brandNameRaw = request.nextUrl.searchParams.get("brandName");
  if (!brandNameRaw) {
    return NextResponse.json({ error: "상표명을 입력해주세요." }, { status: 400 });
  }

  const normalized = normalizeBrandName(brandNameRaw);
  if (!normalized) {
    return NextResponse.json({ error: "상표명을 입력해주세요." }, { status: 400 });
  }

  const classes = parseClasses(request.nextUrl.searchParams);

  const adminClient = createAdminClient();

  let applicationQuery = adminClient
    .from("trademark_applications")
    .select("id, management_number, brand_name, product_classes, status, user_id")
    .eq("normalized_brand_name", normalized)
    .order("created_at", { ascending: false })
    .limit(20);

  let requestQuery = adminClient
    .from("trademark_requests")
    .select("id, brand_name, product_classes, status, user_id")
    .eq("normalized_brand_name", normalized)
    .order("submitted_at", { ascending: false })
    .limit(20);

  if (classes.length > 0) {
    applicationQuery = applicationQuery.overlaps("product_classes", classes);
    requestQuery = requestQuery.overlaps("product_classes", classes);
  }

  const [applicationsResult, requestsResult] = await Promise.all([
    applicationQuery,
    requestQuery,
  ]);

  if (applicationsResult.error) {
    return NextResponse.json({ error: applicationsResult.error.message }, { status: 500 });
  }
  if (requestsResult.error) {
    return NextResponse.json({ error: requestsResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    brandName: brandNameRaw.trim(),
    normalizedBrandName: normalized,
    classes,
    applications: applicationsResult.data ?? [],
    requests: requestsResult.data ?? [],
    duplicateExists:
      (applicationsResult.data?.length ?? 0) > 0 || (requestsResult.data?.length ?? 0) > 0,
  });
}
