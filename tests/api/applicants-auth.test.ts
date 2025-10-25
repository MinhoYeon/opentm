import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

import { GET } from '@/app/api/applicants/route';
import {
  __resetSupabaseServerClientMocks,
  createServerClient as createServerClientMock,
  supabaseServerClientMock,
} from '@/lib/supabaseServerClient';

jest.mock('@/lib/supabaseServerClient');

jest.mock('@/server/db/applicants', () => ({
  listApplicants: jest.fn(),
  logAuditFailure: jest.fn(),
  logAuditSuccess: jest.fn(),
  buildInsertPayload: jest.fn(),
  toApplicantDto: jest.fn(),
}));

describe('GET /api/applicants requires authentication', () => {
  beforeEach(() => {
    __resetSupabaseServerClientMocks();
  });

  it('returns 401 when no Supabase user is present', async () => {
    supabaseServerClientMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    } as any);

    const request = new NextRequest('http://localhost/api/applicants');
    const response = await GET(request);

    expect(createServerClientMock).toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: '인증이 필요합니다.' });
  });

  it('returns 500 when Supabase getUser fails', async () => {
    supabaseServerClientMock.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'boom' },
    } as any);

    const request = new NextRequest('http://localhost/api/applicants');
    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'boom' });
  });
});
