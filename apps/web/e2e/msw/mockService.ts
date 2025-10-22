export interface MockedRequest {
  url: URL;
  method: string;
  headers: Headers;
  bodyText: string;
  json: <T = unknown>() => Promise<T>;
}

export interface MockedRequestContext {
  request: MockedRequest;
}

export interface MockResponseInit {
  status?: number;
  headers?: Record<string, string>;
  body?: string;
}

export type RestResolver = (context: MockedRequestContext) => Promise<MockResponseInit | undefined> | MockResponseInit | undefined;

export interface RestHandler {
  method: string;
  path: string;
  resolver: RestResolver;
}

const normalizePath = (input: string): string => (input.startsWith('/') ? input : `/${input}`);

const createHandler = (method: string) => (path: string, resolver: RestResolver): RestHandler => ({
  method,
  path: normalizePath(path),
  resolver,
});

export const http = {
  get: createHandler('GET'),
  post: createHandler('POST'),
  put: createHandler('PUT'),
};

export class HttpResponse {
  static json(data: unknown, init?: Omit<MockResponseInit, 'body'>) {
    return {
      status: init?.status ?? 200,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      body: JSON.stringify(data),
    } satisfies MockResponseInit;
  }
}

const createHeaders = (rawHeaders: Record<string, string | undefined>): Headers => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (typeof value === 'string') {
      headers.append(key, value);
    }
  }
  return headers;
};

const buildRequest = (playwrightRequest: any): MockedRequest => {
  const url = new URL(playwrightRequest.url());
  const method = playwrightRequest.method();
  const rawHeaders =
    typeof playwrightRequest.headers === 'function'
      ? playwrightRequest.headers()
      : playwrightRequest.headers ?? {};
  const headers = createHeaders(rawHeaders as Record<string, string | undefined>);
  const bodyText =
    typeof playwrightRequest.postData === 'function' ? playwrightRequest.postData() ?? '' : '';

  return {
    url,
    method,
    headers,
    bodyText,
    json: async <T>() => {
      if (!bodyText) {
        return {} as T;
      }

      try {
        return JSON.parse(bodyText) as T;
      } catch {
        return {} as T;
      }
    },
  } satisfies MockedRequest;
};

export const installMockRoutes = async (page: any, handlers: RestHandler[], options?: { baseURL?: string }) => {
  const baseURL = options?.baseURL ?? 'http://127.0.0.1:4173';

  await page.route('**/*', async (route: any, request: any) => {
    const mockedRequest = buildRequest(request);

    if (mockedRequest.url.origin !== baseURL && mockedRequest.url.origin !== 'http://localhost:4173') {
      await route.continue();
      return;
    }

    const matchingHandler = handlers.find(
      (handler) => handler.method === mockedRequest.method && mockedRequest.url.pathname === handler.path,
    );

    if (!matchingHandler) {
      await route.continue();
      return;
    }

    const response = await matchingHandler.resolver({ request: mockedRequest });

    if (!response) {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: response.status ?? 200,
      headers: response.headers ?? {},
      body: response.body,
    });
  });
};
