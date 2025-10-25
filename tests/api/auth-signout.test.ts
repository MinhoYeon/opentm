import { testApiHandler } from 'next-test-api-route-handler';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';

import { POST } from '@/app/api/auth/signout/route';
import {
  __resetSupabaseServerClientMocks,
  createServerClient as createServerClientMock,
  supabaseServerClientMock,
<<<<<<< ours
=======
  getSupabaseAuthCookieNames,
>>>>>>> theirs
} from '@/lib/supabaseServerClient';

jest.mock('@/lib/supabaseServerClient');

describe('POST /api/auth/signout', () => {
  beforeEach(() => {
    __resetSupabaseServerClientMocks();
  });

  async function runHandler() {
    return testApiHandler({
      handler: async (_req, res) => {
        const response = await POST();
        const body = await response.text();

        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });

        res.status(response.status).send(body);
      },
    });
  }

  it('signs the user out and returns a success payload', async () => {
    supabaseServerClientMock.auth.signOut.mockResolvedValueOnce({ error: null } as any);

    const { fetch } = await runHandler();
    const response = await fetch({ method: 'POST' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(supabaseServerClientMock.auth.signOut).toHaveBeenCalledTimes(1);
<<<<<<< ours
=======

    const [authCookieName] = getSupabaseAuthCookieNames();
    expect(response.headers.get('set-cookie')).toContain(`${authCookieName}=`);
    const combined = response.headers.get('x-middleware-set-cookie') ?? '';
    expect(combined).toContain('Max-Age=0');
>>>>>>> theirs
  });

  it('propagates Supabase errors as a 500 response', async () => {
    supabaseServerClientMock.auth.signOut.mockResolvedValueOnce({
      error: { message: 'Sign-out failed' },
    } as any);

    const { fetch } = await runHandler();
    const response = await fetch({ method: 'POST' });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: 'Sign-out failed' });

    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(supabaseServerClientMock.auth.signOut).toHaveBeenCalledTimes(1);
<<<<<<< ours
=======
    expect(response.headers.get('set-cookie')).toBeNull();
>>>>>>> theirs
  });
});
