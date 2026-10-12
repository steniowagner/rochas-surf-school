import * as store from "../session/session.store";

import { apiGet, apiPost, apiPut } from "./api.client";
import { ApiError, NetworkError, SessionExpiredError } from "./api.errors";

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe("apiPost", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  it("posts JSON to the base URL followed by the path", async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, {}));

    await apiPost("/auth/email/code", { email: "a@b.com" });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/email/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.com" }),
    });
  });

  it("posts JSON with the bearer token when one is given", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiPost(
      "/school-rules/acceptances",
      { version: 3 },
      { accessToken: "at-1" },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/school-rules/acceptances",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer at-1",
        },
        body: JSON.stringify({ version: 3 }),
      },
    );
  });

  it("returns the parsed body on success", async () => {
    fetchMock.mockResolvedValue(jsonResponse(202, { expiresAt: "x" }));

    await expect(apiPost("/x", {})).resolves.toEqual({ expiresAt: "x" });
  });

  it.each([
    [422, { errors: ["signInCode.email.invalid"] }, undefined],
    [
      429,
      {
        errors: ["signInCode.resend.tooSoon"],
        details: { resendAvailableAt: "t" },
      },
      { resendAvailableAt: "t" },
    ],
  ])(
    "throws ApiError with status, errors and details on %s",
    async (status, body, details) => {
      fetchMock.mockResolvedValue(jsonResponse(status, body));

      const error = await apiPost("/x", {}).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status, errors: body.errors, details });
    },
  );

  it("throws ApiError with empty errors when the body isn't JSON", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError("bad json");
      },
    });

    const error = await apiPost("/x", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 500, errors: [] });
  });

  it("throws ApiError with empty errors when the body has no errors list", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: "x" }));

    await expect(apiPost("/x", {})).rejects.toMatchObject({ errors: [] });
  });

  it("throws NetworkError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(apiPost("/x", {})).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("apiPut", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  it("puts JSON with the bearer token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "1" }));

    await expect(
      apiPut(
        "/auth/me/whatsapp",
        { whatsappNumber: "+5585999998888" },
        { accessToken: "at-1" },
      ),
    ).resolves.toEqual({ id: "1" });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/me/whatsapp", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer at-1",
      },
      body: JSON.stringify({ whatsappNumber: "+5585999998888" }),
    });
  });

  it("sends no Authorization header without a token", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiPut("/x", {});

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/x", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  });

  it("throws ApiError with status, errors and details", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { errors: ["auth.token.invalid"], details: { a: 1 } }),
    );

    const error = await apiPut("/x", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      errors: ["auth.token.invalid"],
      details: { a: 1 },
    });
  });

  it("throws NetworkError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(apiPut("/x", {})).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("apiGet", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  it("gets the base URL followed by the path, without a body", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiGet("/school-rules");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules", {
      method: "GET",
      headers: {},
    });
  });

  it("sends the bearer token only when one is given", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await apiGet("/school-rules", { accessToken: "token-1" });

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules", {
      method: "GET",
      headers: { Authorization: "Bearer token-1" },
    });
  });

  it("returns the parsed body on 200", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { version: 1 }));

    await expect(apiGet("/x")).resolves.toEqual({ version: 1 });
  });

  it("throws ApiError on 401", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, { errors: ["auth.token.invalid"] }),
    );

    const error = await apiGet("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 401,
      errors: ["auth.token.invalid"],
    });
  });

  it("throws NetworkError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(apiGet("/x")).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("authenticated requests", () => {
  const fetchMock = jest.fn();

  const sessionWith = (accessToken: string, expiresInMs: number) => ({
    user: { id: "user-1", role: "student" } as never,
    tokens: {
      accessToken,
      accessTokenExpiresAt: new Date(Date.now() + expiresInMs).toISOString(),
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z",
    },
  });

  const refreshed = jsonResponse(200, {
    accessToken: "at-2",
    accessTokenExpiresAt: "2099-01-01T00:15:00.000Z",
    refreshToken: "rt-2",
    refreshTokenExpiresAt: "2099-01-01T00:00:00.000Z",
    user: { id: "user-1", role: "student" },
  });

  const invalid = jsonResponse(401, { errors: ["auth.token.invalid"] });

  const callsTo = (path: string) =>
    fetchMock.mock.calls.filter(([url]) => url === `http://api.test${path}`);

  beforeEach(() => {
    store.clearSession();
    store.acknowledgeExpired();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  it("sends the session's access token", async () => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await expect(apiGet("/x", { authenticated: true })).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      Authorization: "Bearer at-1",
    });
  });

  it("sends the renewed access token", async () => {
    store.setSession(sessionWith("at-1", 10_000));
    fetchMock
      .mockResolvedValueOnce(refreshed)
      .mockResolvedValueOnce(jsonResponse(200, {}));

    await apiPut("/x", { a: 1 }, { authenticated: true });

    expect(callsTo("/auth/refresh")).toHaveLength(1);
    expect(callsTo("/x")[0][1].headers.Authorization).toBe("Bearer at-2");
  });

  it("renews once for concurrent requests", async () => {
    store.setSession(sessionWith("at-1", 10_000));
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/auth/refresh") ? refreshed : jsonResponse(200, {}),
    );

    await Promise.all([
      apiGet("/a", { authenticated: true }),
      apiGet("/b", { authenticated: true }),
      apiPost("/c", {}, { authenticated: true }),
    ]);

    expect(callsTo("/auth/refresh")).toHaveLength(1);
    ["/a", "/b", "/c"].forEach((path) =>
      expect(callsTo(path)[0][1].headers.Authorization).toBe("Bearer at-2"),
    );
  });

  it("renews and retries once after a 401", async () => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce(refreshed)
      .mockResolvedValueOnce(jsonResponse(200, { done: true }));

    await expect(
      apiPost("/x", { a: 1 }, { authenticated: true }),
    ).resolves.toEqual({ done: true });

    const sent = callsTo("/x");

    expect(sent).toHaveLength(2);
    expect(sent[1][1].headers.Authorization).toBe("Bearer at-2");
    expect(sent[1][1].body).toBe(sent[0][1].body);
  });

  it("expires the session when the retry is refused again", async () => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce(refreshed)
      .mockResolvedValueOnce(invalid);

    await expect(apiGet("/x", { authenticated: true })).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    expect(store.getSession()).toBeNull();
    expect(store.getSnapshot().expired).toBe(true);
  });

  it("does not show an expiry when the person signed out meanwhile", async () => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce(refreshed)
      .mockImplementationOnce(async () => {
        store.clearSession();

        return invalid;
      });

    await expect(apiGet("/x", { authenticated: true })).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    expect(store.getSnapshot().expired).toBe(false);
  });

  it("passes other errors from the retry through", async () => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce(refreshed)
      .mockResolvedValueOnce(jsonResponse(500, {}));

    await expect(apiGet("/x", { authenticated: true })).rejects.toMatchObject({
      status: 500,
    });
  });

  it("does not retry a public request", async () => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock.mockResolvedValue(invalid);

    await expect(apiGet("/x")).rejects.toMatchObject({ status: 401 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [403, ["user.status.notDeleted"]],
    [401, ["something.else"]],
    [500, []],
  ])("does not renew on other errors (%s)", async (status, errors) => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock.mockResolvedValue(jsonResponse(status, { errors }));

    await expect(apiGet("/x", { authenticated: true })).rejects.toBeInstanceOf(
      ApiError,
    );

    expect(callsTo("/auth/refresh")).toHaveLength(0);
    expect(store.getSession()).not.toBeNull();
  });

  it("fails with SessionExpiredError without a session", async () => {
    fetchMock.mockResolvedValue(invalid);

    await expect(apiGet("/x", { authenticated: true })).rejects.toBeInstanceOf(
      SessionExpiredError,
    );

    expect(store.getSnapshot().expired).toBe(false);
  });

  it("passes a refresh network failure through", async () => {
    store.setSession(sessionWith("at-1", 600_000));
    fetchMock
      .mockResolvedValueOnce(invalid)
      .mockRejectedValueOnce(new TypeError("offline"));

    await expect(apiGet("/x", { authenticated: true })).rejects.toBeInstanceOf(
      NetworkError,
    );
    expect(store.getSession()).not.toBeNull();
  });
});

describe("timeoutMs", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("throws NetworkError when the request times out", async () => {
    fetchMock.mockImplementation(
      (_url: string, init: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );

    const result = apiGet("/x", { timeoutMs: 8000 }).catch((e: unknown) => e);

    await jest.advanceTimersByTimeAsync(8000);

    expect(await result).toBeInstanceOf(NetworkError);
  });

  it("does not abort a request that answered in time", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));

    await expect(apiGet("/x", { timeoutMs: 8000 })).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
    await jest.advanceTimersByTimeAsync(8000);
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
  });
});
