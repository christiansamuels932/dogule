import { RefreshError, SDKError } from "./errors.js";
import {
  BackendErrorPayload,
  Credentials,
  RequestOptions,
  ResourceName,
  SDKConfig,
} from "./types.js";

const JSON_MIME_PATTERN = /application\/json/i;

type FetchImplementation = typeof fetch;

const DEFAULT_ORIGIN =
  typeof globalThis.location?.origin === "string"
    ? globalThis.location.origin
    : "http://localhost";

const BASE = process.env.SDK_BASE ?? "/api";

let base = normalizeBase(BASE);

export function setBaseUrl(candidate: string) {
  base = normalizeBase(candidate);
}

function normalizeBase(candidate: string): string {
  const value = candidate?.trim() || "/api";

  const toAbsolute = (input: string) => {
    if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)) {
      return input;
    }

    const relative = input.startsWith("/") ? input : `/${input}`;
    return new URL(relative, DEFAULT_ORIGIN).toString();
  };

  const url = new URL(toAbsolute(value));

  if (!url.pathname.endsWith("/")) {
    url.pathname = `${url.pathname.replace(/\/?$/, "")}/`;
  }

  return url.toString();
}

function buildUrl(path: string, baseUrl: string): URL {
  const normalizedPath = path.replace(/^\/+/, "");
  return new URL(normalizedPath, baseUrl);
}

function wrapNetworkError(error: unknown): never {
  const message =
    error instanceof Error && error.message
      ? error.message
      : "Network request failed";

  throw new SDKError("ERR_SDK_FETCH_001", message, 0, error ?? undefined);
}

function buildErrorCode(resource: ResourceName, payload?: BackendErrorPayload, status?: number) {
  const candidate =
    payload?.code ?? payload?.error ?? (status ? `HTTP_${status}` : "UNKNOWN");
  const normalized = candidate
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `ERR_${resource.toUpperCase()}_${normalized || "UNKNOWN"}`;
}

function ensureFetch(fetchImpl?: FetchImplementation): FetchImplementation {
  if (fetchImpl) {
    return fetchImpl;
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis);
  }

  throw new Error("Fetch API is not available in the current environment");
}

export interface RequestClient {
  request<T>(options: RequestOptions): Promise<T>;
  getCredentials(): Credentials;
}

export function createRequestClient(config: SDKConfig): RequestClient {
  let credentials: Credentials = { ...config.credentials };
  const fetchImpl = ensureFetch(config.fetch);
  const configBase = config.baseUrl ? normalizeBase(config.baseUrl) : null;

  const resolveBaseUrl = () => configBase ?? base;

  const commitCredentials = (updated: Credentials) => {
    credentials = updated;
    config.onCredentialsChange?.(credentials);
  };

  const refreshCredentials = async () => {
    let response: Response;

    try {
      response = await fetchImpl(buildUrl("auth/refresh", resolveBaseUrl()), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({ refreshToken: credentials.refreshToken }),
      });
    } catch (error) {
      throw wrapNetworkError(error);
    }

    if (!response.ok) {
      const payload = await safeParseJson(response);
      throw new RefreshError(
        payload?.message ?? "Unable to refresh authentication token",
        response.status,
        payload ?? undefined,
      );
    }

    const payload = (await safeParseJson(response)) as
      | { accessToken: string; refreshToken?: string }
      | null;

    if (!payload?.accessToken) {
      throw new RefreshError(
        "Refresh endpoint returned an invalid payload",
        response.status,
        payload ?? undefined,
      );
    }

    commitCredentials({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken ?? credentials.refreshToken,
    });
  };

  const performRequest = async (
    options: RequestOptions,
    isRetry = false,
  ): Promise<Response> => {
    const { path, body, resource: _resource, ...init } = options;
    void _resource;
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");

    if (credentials.accessToken) {
      headers.set("authorization", `Bearer ${credentials.accessToken}`);
    }

    let requestBody: BodyInit | undefined;
    if (body !== undefined) {
      headers.set("content-type", "application/json");
      requestBody = JSON.stringify(body);
    }

    let response: Response;

    try {
      response = await fetchImpl(buildUrl(path, resolveBaseUrl()), {
        ...init,
        headers,
        body: requestBody,
      });
    } catch (error) {
      throw wrapNetworkError(error);
    }

    if (response.status === 401 && !isRetry) {
      await refreshCredentials();
      return performRequest(options, true);
    }

    return response;
  };

  const request = async <T>(options: RequestOptions): Promise<T> => {
    const response = await performRequest(options);

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = await safeParseJson(response);

    if (!response.ok) {
      const code = buildErrorCode(options.resource, payload ?? undefined, response.status);
      const message =
        payload?.message ?? response.statusText ?? "Request failed without a message";
      throw new SDKError(code, message, response.status, payload ?? undefined);
    }

    return (payload ?? undefined) as T;
  };

  return {
    request,
    getCredentials: () => ({ ...credentials }),
  };
}

async function safeParseJson(response: Response): Promise<BackendErrorPayload | null> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !JSON_MIME_PATTERN.test(contentType)) {
    return null;
  }

  try {
    return (await response.json()) as BackendErrorPayload;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Failed to parse JSON response";

    throw new SDKError("ERR_SDK_JSON_001", message, response.status, error ?? undefined);
  }
}
