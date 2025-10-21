import { cookies } from "next/headers";

type SupabaseAuthTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
};

type SupabaseUser = {
  id: string;
  email: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
  aud?: string;
  role?: string;
};

type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: SupabaseUser;
};

type SessionResponse = {
  data: { session: SupabaseSession | null };
  error: Error | null;
};

type TrademarkRequestsResponse = {
  data: unknown[];
  count: number;
  error: Error | null;
};

type TrademarkRequestQuery = {
  from: number;
  to: number;
  userId?: string | null;
  userEmail?: string | null;
  orderBy?: string;
  ascending?: boolean;
};

function parseProjectRef(supabaseUrl: string) {
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.hostname.split(".")[0];
  } catch {
    return undefined;
  }
}

function parseAuthCookie(rawCookie: string | undefined): SupabaseAuthTokens | null {
  if (!rawCookie) {
    return null;
  }

  const extractTokens = (value: unknown): SupabaseAuthTokens | null => {
    if (!value || typeof value !== "object") {
      return null;
    }

    const obj = value as Record<string, unknown>;

    // Top-level fields
    if (typeof obj.access_token === "string") {
      return {
        access_token: obj.access_token,
        refresh_token: typeof obj.refresh_token === "string" ? (obj.refresh_token as string) : undefined,
        expires_at: typeof obj.expires_at === "number" ? (obj.expires_at as number) : undefined,
      };
    }

    // Nested known shapes (e.g., { currentSession: { ... } } or { session: { ... } })
    if (obj.currentSession && typeof obj.currentSession === "object") {
      return extractTokens(obj.currentSession);
    }
    if (obj.session && typeof obj.session === "object") {
      return extractTokens(obj.session);
    }

    return null;
  };

  // Case 1: @supabase/ssr uses a base64-encoded JSON cookie prefixed with "base64-"
  if (rawCookie.startsWith("base64-")) {
    try {
      const base64 = rawCookie.slice("base64-".length);
      const jsonText = Buffer.from(base64, "base64").toString("utf-8");
      const parsed = JSON.parse(jsonText);
      return extractTokens(parsed);
    } catch {
      // fall through to other parsing strategies
    }
  }

  // Case 2: URL-encoded JSON
  try {
    const decoded = decodeURIComponent(rawCookie);
    const parsed = JSON.parse(decoded);
    const tokens = extractTokens(parsed);
    if (tokens) return tokens;
  } catch {
    // ignore
  }

  // Case 3: Raw JSON
  try {
    const parsed = JSON.parse(rawCookie);
    return extractTokens(parsed);
  } catch {
    return null;
  }
}

function parseContentRange(headerValue: string | null): number {
  if (!headerValue) {
    return 0;
  }

  const parts = headerValue.split("/");
  if (parts.length !== 2) {
    return 0;
  }

  const total = Number.parseInt(parts[1], 10);
  return Number.isFinite(total) ? total : 0;
}

async function fetchJson(url: string, options: RequestInit) {
  const response = await fetch(url, options);

  if (response.status === 204) {
    return { json: null, response } as const;
  }

  let json: unknown = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return { json, response } as const;
}

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const projectRef = parseProjectRef(supabaseUrl);
  const cookieName = projectRef ? `sb-${projectRef}-auth-token` : undefined;
  async function readTokens(): Promise<SupabaseAuthTokens | null> {
    const cookieStore = await cookies();
    const rawCookie = cookieName ? cookieStore.get(cookieName)?.value : undefined;
    return parseAuthCookie(rawCookie);
  }

  async function getSession(): Promise<SessionResponse> {
    const tokens = await readTokens();

    if (!tokens?.access_token) {
      return { data: { session: null }, error: null };
    }

    const { json, response } = await fetchJson(`${supabaseUrl}/auth/v1/user`, {
      method: "GET",
      headers: {
        accept: "application/json",
        apikey: supabaseAnonKey,
        authorization: `Bearer ${tokens.access_token}`,
      },
      cache: "no-store",
    });

    if (!response.ok || !json) {
      if (response.status === 401) {
        return { data: { session: null }, error: null };
      }

      const message = typeof json === "object" && json !== null && "message" in json ? String(json.message) : "Unable to fetch Supabase user.";
      return { data: { session: null }, error: new Error(message) };
    }

    const user = json as SupabaseUser;

    return {
      data: {
        session: {
          access_token: tokens.access_token!,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at,
          user,
        },
      },
      error: null,
    };
  }

  async function listTrademarkRequests(query: TrademarkRequestQuery): Promise<TrademarkRequestsResponse> {
    const tokens = await readTokens();

    if (!tokens?.access_token) {
      return { data: [], count: 0, error: new Error("Not authenticated") };
    }

    const searchParams = new URLSearchParams();
    searchParams.set("select", "*");

    if (query.userId && query.userEmail) {
      searchParams.set("or", `(user_id.eq.${query.userId},user_email.eq.${query.userEmail})`);
    } else if (query.userId) {
      searchParams.set("user_id", `eq.${query.userId}`);
    } else if (query.userEmail) {
      searchParams.set("user_email", `eq.${query.userEmail}`);
    }

    if (query.orderBy) {
      const direction = query.ascending === false ? "asc" : "desc";
      searchParams.set("order", `${query.orderBy}.${direction}`);
    }

    const url = `${supabaseUrl}/rest/v1/trademark_requests?${searchParams.toString()}`;

    const headers: HeadersInit = {
      accept: "application/json",
      apikey: supabaseAnonKey,
      authorization: `Bearer ${tokens.access_token}`,
      prefer: "count=exact",
      "range-unit": "items",
      range: `${Math.max(query.from, 0)}-${Math.max(query.to, 0)}`,
    };

    const { json, response } = await fetchJson(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!response.ok || !Array.isArray(json)) {
      const message = typeof json === "object" && json !== null && "message" in json ? String(json.message) : "Failed to load trademark requests.";
      return { data: [], count: 0, error: new Error(message) };
    }

    const total = parseContentRange(response.headers.get("content-range"));

    return {
      data: json,
      count: total,
      error: null,
    };
  }

  return {
    auth: {
      getSession,
    },
    trademarkRequests: {
      list: listTrademarkRequests,
    },
  };
}

export type { SupabaseSession, SupabaseUser };
