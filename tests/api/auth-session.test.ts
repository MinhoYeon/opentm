import { describe, expect, it, beforeEach } from '@jest/globals';

import { POST } from '@/app/api/auth/session/route';
import {
  __resetSupabaseServerClientMocks,
  createServerClient as createServerClientMock,
  supabaseServerClientMock,
  getSupabaseAuthCookieNames,
} from '@/lib/supabaseServerClient';

jest.mock('@/lib/supabaseServerClient');

describe('POST /api/auth/session', () => {
  beforeEach(() => {
    __resetSupabaseServerClientMocks();
  });

  function createRequest(body: unknown) {
    return new Request('http://localhost/api/auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('sets a session cookie when a user signs in', async () => {
    const session = {
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'user-1', email: 'user@example.com' },
    } as any;

    supabaseServerClientMock.auth.setSession.mockResolvedValueOnce({ data: { session }, error: null });

    const request = createRequest({ event: 'SIGNED_IN', session });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, session: { user: session.user } });

    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(supabaseServerClientMock.auth.setSession).toHaveBeenCalledWith(session);

    const [authCookieName, refreshCookieName] = getSupabaseAuthCookieNames();
    const setCookie = response.headers.get('set-cookie') ?? '';
    const combined = response.headers.get('x-middleware-set-cookie') ?? '';
    expect(setCookie).toContain(`${authCookieName}=`);
    expect(combined).toContain(`${refreshCookieName}=`);
  });

  it('returns 400 when the session payload is missing', async () => {
    const request = createRequest({ event: 'SIGNED_IN' });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: '세션 정보가 필요합니다.' });
    expect(supabaseServerClientMock.auth.setSession).not.toHaveBeenCalled();
  });

  it('returns 500 when Supabase setSession fails', async () => {
    supabaseServerClientMock.auth.setSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'invalid session' },
    } as any);

    const session = {
      access_token: 'broken',
      user: { id: 'user-1' },
    } as any;

    const request = createRequest({ event: 'SIGNED_IN', session });
    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: 'invalid session' });
  });

  it('clears cookies when a user signs out', async () => {
    const request = createRequest({ event: 'SIGNED_OUT' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(supabaseServerClientMock.auth.signOut).toHaveBeenCalled();
    const combined = response.headers.get('x-middleware-set-cookie') ?? '';
    expect(combined).toContain('Max-Age=0');
  });

  it('rejects unsupported events', async () => {
    const request = createRequest({ event: 'PASSWORD_RECOVERY' });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: '지원하지 않는 이벤트입니다: PASSWORD_RECOVERY' });
  });

  it('rejects invalid JSON bodies', async () => {
    const request = new Request('http://localhost/api/auth/session', {
      method: 'POST',
      body: 'not-json',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: '잘못된 JSON 본문입니다.' });
  });
});
