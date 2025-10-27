import { createHash } from "crypto";

import { resolveAdminContext, type AdminContext, type AdminRole } from "@/lib/admin/roles";
import { createAdminClient } from "@/lib/supabaseAdminClient";
import { createServerClient } from "@/lib/supabase/server";

import { ApiError } from "./errors";

type RequireUserOptions = {
  requireAdmin?: boolean;
};

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
    app_metadata?: Record<string, unknown> | null;
  };
};

type SupabaseSessionResponse = {
  data: { session: SupabaseSession | null };
  error: Error | null;
};

type AdminSessionRow = {
  id: string;
  user_id: string;
  session_hash: string;
  is_revoked: boolean;
  mfa_verified_at: string | null;
  last_seen_at: string;
};

type AdminContextResult = {
  session: SupabaseSession;
  adminSession: AdminSessionRow;
  context: AdminContext;
};

function toIsoDate(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  if (value === true) {
    return new Date().toISOString();
  }
  return null;
}

function resolveUserMfaTimestamp(user: SupabaseSession["user"]): string | null {
  const sources = [user.app_metadata, user.user_metadata];
  for (const metadata of sources) {
    if (!metadata || typeof metadata !== "object") continue;
    const record = metadata as Record<string, unknown>;
    const timestamp = toIsoDate(record.mfa_verified_at);
    if (timestamp) {
      return timestamp;
    }
  }
  return null;
}

async function requireAuthSession(): Promise<SupabaseSession> {
  const serverClient = createServerClient();
  const { data, error } = (await serverClient.auth.getSession()) as SupabaseSessionResponse;

  if (error) {
    throw new ApiError("세션 정보를 가져오지 못했습니다.", { status: 500, details: error.message });
  }

  if (!data.session) {
    throw new ApiError("인증이 필요합니다.", { status: 401 });
  }

  return data.session;
}

async function upsertAdminSession(session: SupabaseSession): Promise<AdminSessionRow> {
  if (!session.access_token) {
    throw new ApiError("세션 토큰이 유효하지 않습니다.", { status: 401 });
  }

  const sessionHash = createHash("sha256").update(session.access_token).digest("hex");
  const adminClient = createAdminClient();

  const { data: existing, error: fetchError } = await adminClient
    .from("admin_sessions")
    .select("id, user_id, session_hash, is_revoked, mfa_verified_at, last_seen_at")
    .eq("session_hash", sessionHash)
    .maybeSingle();

  if (fetchError) {
    throw new ApiError("관리자 세션을 확인하지 못했습니다.", { status: 500, details: fetchError.message });
  }

  const nowIso = new Date().toISOString();
  const resolvedMfa = resolveUserMfaTimestamp(session.user);

  if (!existing) {
    const insertPayload: Record<string, unknown> = {
      user_id: session.user.id,
      session_hash: sessionHash,
      last_seen_at: nowIso,
    };

    if (resolvedMfa) {
      insertPayload.mfa_verified_at = resolvedMfa;
    }

    const { data: inserted, error: insertError } = await adminClient
      .from("admin_sessions")
      .insert(insertPayload)
      .select("id, user_id, session_hash, is_revoked, mfa_verified_at, last_seen_at")
      .single();

    if (insertError || !inserted) {
      throw new ApiError("관리자 세션을 생성하지 못했습니다.", {
        status: 500,
        details: insertError?.message,
      });
    }

    if (inserted.is_revoked) {
      throw new ApiError("세션이 만료되었습니다.", { status: 401 });
    }

    return inserted as AdminSessionRow;
  }

  if (existing.is_revoked) {
    throw new ApiError("세션이 만료되었습니다.", { status: 401 });
  }

  const updates: Record<string, unknown> = { last_seen_at: nowIso };
  if (!existing.mfa_verified_at && resolvedMfa) {
    updates.mfa_verified_at = resolvedMfa;
  }

  if (Object.keys(updates).length > 0) {
    const { data: updated, error: updateError } = await adminClient
      .from("admin_sessions")
      .update(updates)
      .eq("id", existing.id)
      .select("id, user_id, session_hash, is_revoked, mfa_verified_at, last_seen_at")
      .single();

    if (updateError || !updated) {
      throw new ApiError("관리자 세션을 갱신하지 못했습니다.", {
        status: 500,
        details: updateError?.message,
      });
    }

    return updated as AdminSessionRow;
  }

  return existing as AdminSessionRow;
}

function assertAllowedRole(role: AdminRole, allowedRoles?: AdminRole[]) {
  if (!allowedRoles || allowedRoles.length === 0) {
    return;
  }
  if (!allowedRoles.includes(role)) {
    throw new ApiError("접근 권한이 없습니다.", { status: 403 });
  }
}

function assertMfaIfRequired(role: AdminRole, adminSession: AdminSessionRow) {
  // 개발 환경에서는 MFA 체크 비활성화
  const isDevelopment = process.env.NODE_ENV === "development";
  if (isDevelopment) {
    return;
  }

  if ((role === "super_admin" || role === "operations_admin") && !adminSession.mfa_verified_at) {
    throw new ApiError("다중 인증이 완료되지 않았습니다.", { status: 403 });
  }
}

export async function requireAuthenticatedSession(options: RequireUserOptions = {}) {
  const session = await requireAuthSession();

  if (!options.requireAdmin) {
    return session;
  }

  const context = resolveAdminContext(session.user);
  if (!context) {
    throw new ApiError("접근 권한이 없습니다.", { status: 403 });
  }

  await upsertAdminSession(session);

  return session;
}

export type AuthenticatedSession = Awaited<ReturnType<typeof requireAuthenticatedSession>>;

type RequireAdminContextOptions = {
  allowedRoles?: AdminRole[];
};

export async function requireAdminContext(options: RequireAdminContextOptions = {}): Promise<AdminContextResult> {
  const session = await requireAuthSession();
  const adminContext = resolveAdminContext(session.user);

  if (!adminContext) {
    throw new ApiError("관리자 권한이 필요합니다.", { status: 403 });
  }

  assertAllowedRole(adminContext.role, options.allowedRoles);

  const adminSession = await upsertAdminSession(session);
  assertMfaIfRequired(adminContext.role, adminSession);

  return { session, adminSession, context: adminContext };
}

export type RequiredAdminContext = Awaited<ReturnType<typeof requireAdminContext>>;
