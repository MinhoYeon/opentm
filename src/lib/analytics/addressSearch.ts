import { createHmac } from "crypto";

import { ApiError } from "@/lib/api/errors";
import { createAdminClient } from "@/lib/supabaseAdminClient";

type LogAddressSearchParams = {
  userId: string;
  query: string;
  eventType?: "search" | "select";
  metadata?: Record<string, unknown>;
};

function maskQuery(query: string): string {
  return query.replace(/[0-9]/g, "•");
}

const adminClient = createAdminClient();

export async function logAddressSearch(params: LogAddressSearchParams) {
  const trimmed = params.query.trim();
  if (!trimmed) {
    throw new ApiError("로그에 사용할 검색어가 필요합니다.", { status: 400 });
  }
  const secret = process.env.NAVER_MAP_CLIENT_SECRET ?? "naver-map";
  const queryHash = createHmac("sha256", secret).update(trimmed).digest("hex");

  const { error } = await adminClient.from("address_search_logs").insert({
    user_id: params.userId,
    query_hash: queryHash,
    masked_query: maskQuery(trimmed),
    event_type: params.eventType ?? "search",
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new ApiError("주소 검색 로그를 기록하지 못했습니다.", { status: 500, details: error.message });
  }
}
