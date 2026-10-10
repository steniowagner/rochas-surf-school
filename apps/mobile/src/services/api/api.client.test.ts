import { apiPost, apiPut } from "./api.client";
import { ApiError, NetworkError } from "./api.errors";

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
  ])("throws ApiError with status, errors and details on %s", async (status, body, details) => {
    fetchMock.mockResolvedValue(jsonResponse(status, body));

    const error = await apiPost("/x", {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status, errors: body.errors, details });
  });

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
      apiPut("/auth/me/whatsapp", { whatsappNumber: "+5585999998888" }, { accessToken: "at-1" }),
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
    expect(error).toMatchObject({ status: 401, errors: ["auth.token.invalid"], details: { a: 1 } });
  });

  it("throws NetworkError when fetch rejects", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));

    await expect(apiPut("/x", {})).rejects.toBeInstanceOf(NetworkError);
  });
});
