import { NextRequest, NextResponse } from "next/server";

import { requireAdminContext } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/errors";
import { listBankTransferReviews } from "@/lib/payments/db";

type AllowedStatus = "pending" | "confirmed" | "rejected";

function parseStatuses(param: string | null): AllowedStatus[] | undefined {
  if (!param) {
    return undefined;
  }
  const tokens = param
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean) as AllowedStatus[];
  const allowed: AllowedStatus[] = [];
  for (const token of tokens) {
    if (token === "pending" || token === "confirmed" || token === "rejected") {
      allowed.push(token);
    }
  }
  return allowed.length > 0 ? allowed : undefined;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminContext({ allowedRoles: ["super_admin", "finance_admin", "operations_admin"] });
    const statuses = parseStatuses(request.nextUrl.searchParams.get("status"));
    const reviews = await listBankTransferReviews({ statuses });
    return NextResponse.json({ ok: true, reviews });
  } catch (error) {
    return handleApiError(error, "payments:bank-transfers:list");
  }
}
