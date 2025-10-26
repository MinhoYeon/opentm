import { describe, expect, it, beforeEach, afterEach, afterAll, jest } from '@jest/globals';
import type { NextRequest } from 'next/server';

import { POST } from '@/app/api/trademark-search/route';

async function invokeRoute(body: unknown, headers: Record<string, string> = {}) {
  const request = new Request('http://localhost/api/trademark-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }) as unknown as NextRequest;

  return POST(request);
}

describe('POST /api/trademark-search', () => {
  const originalKey = process.env.KIPRIS_API_KEY;
  const originalEndpoint = process.env.KIPRIS_API_ENDPOINT;
  const defaultEndpoint = 'https://example.com/kipris';
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    process.env.KIPRIS_API_ENDPOINT = defaultEndpoint;
    fetchMock.mockReset();
  });

  afterEach(() => {
    process.env.KIPRIS_API_KEY = originalKey;
    process.env.KIPRIS_API_ENDPOINT = originalEndpoint;
    fetchMock.mockReset();
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  it('rejects non-JSON payloads with a 400 response', async () => {
    const response = await POST(
      new Request('http://localhost/api/trademark-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid',
      }) as unknown as NextRequest,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '유효한 검색 요청이 아닙니다.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a non-empty query parameter', async () => {
    const response = await invokeRoute({ query: '   ' });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: '검색할 상표명을 입력해주세요.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 500 when the KIPRIS service key is missing', async () => {
    delete process.env.KIPRIS_API_KEY;

    const response = await invokeRoute({ query: '오픈상표' });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'KIPRIS API 인증 정보가 설정되어 있지 않습니다.' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('performs a search and returns normalized results', async () => {
    process.env.KIPRIS_API_KEY = 'test-key';

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          results: [
            {
              title: '오픈상표',
              classification: ['01'],
              similarMark: '오픈TM',
              applicationNumber: '402024000100',
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      ),
    );

    const response = await invokeRoute({ query: '오픈상표', classifications: ['01'] });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.count).toBe(1);
    expect(payload.results[0]).toMatchObject({ markName: '오픈상표', classes: ['01'] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestedUrl] = fetchMock.mock.calls[0];
    const url = new URL(requestedUrl as string);
    expect(url.searchParams.get('ServiceKey')).toBe('test-key');
    expect(url.searchParams.get('trademarkName')).toBe('오픈상표');
    expect(url.searchParams.get('classification')).toBe('01');
  });

  it('propagates upstream failures with an error response', async () => {
    process.env.KIPRIS_API_KEY = 'test-key';

    fetchMock.mockResolvedValueOnce(
      new Response('Service unavailable', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );

    const response = await invokeRoute({ query: '오픈상표' });

    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.error).toBe('상표 검색에 실패했습니다.');
    expect(payload.details).toContain('Service unavailable');
  });
});
