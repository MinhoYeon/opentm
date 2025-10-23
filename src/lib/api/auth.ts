import { createServerClient } from "@/lib/supabase/server";
import { ApiError } from "./errors";

type RequireUserOptions = {
  requireAdmin?: boolean;
};

function isAdminUser(user: { app_metadata?: Record<string, unknown> | null } | null): boolean {
  if (!user) {
    return false;
  }

  const metadata = (user.app_metadata ?? {}) as Record<string, unknown>;

  if (metadata.role === "admin") {
    return true;
  }

  const roles = metadata.roles;
  if (Array.isArray(roles) && roles.includes("admin")) {
    return true;
  }

  if (metadata.is_admin === true) {
    return true;
  }

  return false;
}

export async function requireAuthenticatedSession(options: RequireUserOptions = {}) {
  const serverClient = createServerClient();
  const {
    data: { session },
    error,
  } = await serverClient.auth.getSession();

  if (error) {
    throw new ApiError("세션 정보를 가져오지 못했습니다.", { status: 500, details: error.message });
  }

  if (!session) {
    throw new ApiError("인증이 필요합니다.", { status: 401 });
  }

  if (options.requireAdmin && !isAdminUser(session.user)) {
    throw new ApiError("접근 권한이 없습니다.", { status: 403 });
  }

  return session;
}

export type AuthenticatedSession = Awaited<ReturnType<typeof requireAuthenticatedSession>>;
