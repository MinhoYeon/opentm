import { jest } from '@jest/globals';

type SupabaseAuthResponse<T> = {
  data: T;
  error: { message: string } | null;
};

const defaultSessionResponse: SupabaseAuthResponse<{ session: unknown | null }> = {
  data: { session: null },
  error: null,
};

const defaultUserResponse: SupabaseAuthResponse<{ user: unknown | null }> = {
  data: { user: null },
  error: null,
};

const signOutMock = jest.fn(async () => ({ error: null }));
const setSessionMock = jest.fn(async () => ({ data: null, error: null }));
const getSessionMock = jest.fn(async () => defaultSessionResponse);
const getUserMock = jest.fn(async () => defaultUserResponse);

const supabaseServerClientMock = {
  auth: {
    signOut: signOutMock,
    setSession: setSessionMock,
    getSession: getSessionMock,
    getUser: getUserMock,
  },
};

function resolveProjectRef(): string | undefined {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return undefined;
  }
  try {
    const parsed = new URL(supabaseUrl);
    const [projectRef] = parsed.hostname.split('.');
    return projectRef;
  } catch {
    return undefined;
  }
}

export function getSupabaseAuthCookieNames(): [string, string] {
  const projectRef = resolveProjectRef();
  const base = projectRef ? `sb-${projectRef}-auth-token` : 'sb-auth-token';
  return [base, `${base}.0`];
}

export const createServerClient = jest.fn(() => supabaseServerClientMock);

export function __resetSupabaseServerClientMocks() {
  signOutMock.mockReset();
  setSessionMock.mockReset();
  getSessionMock.mockReset();
  getUserMock.mockReset();

  signOutMock.mockResolvedValue({ error: null });
  setSessionMock.mockResolvedValue({ data: null, error: null });
  getSessionMock.mockResolvedValue(defaultSessionResponse);
  getUserMock.mockResolvedValue(defaultUserResponse);

  createServerClient.mockReset();
  createServerClient.mockImplementation(() => supabaseServerClientMock);
}

export { supabaseServerClientMock };
