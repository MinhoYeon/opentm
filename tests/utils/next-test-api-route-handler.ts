import type { IncomingHttpHeaders } from 'node:http';

type Handler = (req: RequestLike, res: ResponseLike) => void | Promise<void>;

type RequestLike = {
  method?: string;
  headers: IncomingHttpHeaders;
  body?: unknown;
};

type ResponseLike = {
  status(code: number): ResponseLike;
  setHeader(key: string, value: string | string[]): void;
  send(body?: unknown): void;
};

type TestApiHandlerConfig = {
  handler: Handler;
};

type FetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type TestContext = {
  fetch(init?: FetchInit): Promise<Response>;
};

function normalizeBody(body: unknown) {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (body instanceof Uint8Array) {
    return body;
  }
  if (typeof body === 'string') {
    return Buffer.from(body);
  }
  if (body instanceof ArrayBuffer) {
    return Buffer.from(body);
  }
  return Buffer.from(JSON.stringify(body));
}

export async function testApiHandler(config: TestApiHandlerConfig): Promise<TestContext> {
  const { handler } = config;

  async function invoke(init?: FetchInit): Promise<Response> {
    const request: RequestLike = {
      method: init?.method ?? 'GET',
      headers: init?.headers ?? {},
      body: init?.body,
    };

    let statusCode = 200;
    const headerMap = new Map<string, string | string[]>();
    let payload: Buffer | undefined;

    const response: ResponseLike = {
      status(code: number) {
        statusCode = code;
        return response;
      },
      setHeader(key: string, value: string | string[]) {
        headerMap.set(key.toLowerCase(), value);
      },
      send(body?: unknown) {
        const normalized = normalizeBody(body);
        payload = normalized;
      },
    };

    await handler(request, response);

    const headers = new Headers();
    for (const [key, value] of headerMap) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          headers.append(key, entry);
        }
      } else {
        headers.set(key, value);
      }
    }

    const body = payload ?? Buffer.alloc(0);
    return new Response(body, { status: statusCode, headers });
  }

  return {
    fetch(init?: FetchInit) {
      return invoke(init);
    },
  };
}
