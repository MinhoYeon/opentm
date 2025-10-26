import { NextRequest, NextResponse } from "next/server";

import { requireAuthenticatedSession } from "@/lib/api/auth";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { logAddressSearch } from "@/lib/analytics/addressSearch";

function parseBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError("잘못된 요청 본문입니다.", { status: 400 });
  }
  const record = value as Record<string, unknown>;
  const query = typeof record.query === "string" ? record.query : "";
  const event = typeof record.event === "string" ? record.event : "search";
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
    ? (record.metadata as Record<string, unknown>)
    : {};
  return { query, event, metadata };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuthenticatedSession();
    const body = parseBody(await request.json());
    const eventType = body.event === "select" ? "select" : "search";
    await logAddressSearch({
      userId: session.user.id,
      query: body.query,
      eventType,
      metadata: body.metadata,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "naver-map:log");
  }
}
