import { describe, expect, it, vi } from "vitest";

import { RefreshError, createDoguleSDK } from "./index.js";

describe("Dogule SDK", () => {
  it("applies base URL and authorization header", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      expect(String(input)).toBe("https://api.example.com/kunden");
      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer token-123");
      expect(headers.get("accept")).toBe("application/json");

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const sdk = createDoguleSDK({
      baseUrl: "https://api.example.com",
      credentials: {
        accessToken: "token-123",
        refreshToken: "refresh-123",
      },
      fetch: fetchMock,
    });

    await sdk.kunden.list();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes credentials after a 401 response and retries the request", async () => {
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ input, init });

      if (calls.length === 1) {
        return new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        });
      }

      if (calls.length === 2) {
        expect(String(input)).toBe("https://api.example.com/auth/refresh");
        return new Response(
          JSON.stringify({
            accessToken: "token-456",
            refreshToken: "refresh-456",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      const headers = new Headers(init?.headers);
      expect(headers.get("authorization")).toBe("Bearer token-456");

      return new Response(
        JSON.stringify([
          { id: "1", name: "Max Mustermann", email: "max@example.com" },
        ]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const onCredentialsChange = vi.fn();

    const sdk = createDoguleSDK({
      baseUrl: "https://api.example.com",
      credentials: {
        accessToken: "token-123",
        refreshToken: "refresh-123",
      },
      fetch: fetchMock,
      onCredentialsChange,
    });

    const kunden = await sdk.kunden.list();

    expect(kunden).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(onCredentialsChange).toHaveBeenCalledWith({
      accessToken: "token-456",
      refreshToken: "refresh-456",
    });
    expect(sdk.getCredentials()).toEqual({
      accessToken: "token-456",
      refreshToken: "refresh-456",
    });
  });

  it("maps backend errors to ERR_* codes", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          code: "validation_failed",
          message: "E-Mail-Adresse fehlt",
        }),
        {
          status: 422,
          headers: { "content-type": "application/json" },
        },
      );
    });

    const sdk = createDoguleSDK({
      baseUrl: "https://api.example.com",
      credentials: {
        accessToken: "token-123",
        refreshToken: "refresh-123",
      },
      fetch: fetchMock,
    });

    await expect(() =>
      sdk.kunden.create({ name: "Erika", email: "", phone: "" }),
    ).rejects.toMatchObject({
      code: "ERR_KUNDEN_VALIDATION_FAILED",
      status: 422,
    });
  });

  it("throws refresh error when refresh endpoint fails", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/auth/refresh")) {
        return new Response(JSON.stringify({ message: "Refresh failed" }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    });

    const sdk = createDoguleSDK({
      baseUrl: "https://api.example.com",
      credentials: {
        accessToken: "token-123",
        refreshToken: "refresh-123",
      },
      fetch: fetchMock,
    });

    await expect(() => sdk.hunde.list()).rejects.toBeInstanceOf(RefreshError);
  });
});
