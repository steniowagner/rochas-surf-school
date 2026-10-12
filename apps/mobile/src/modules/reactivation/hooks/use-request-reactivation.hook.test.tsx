import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionProvider, useSession } from "@/providers/session";
import { apiPost } from "@/services/api";

import { useRequestReactivation } from "./use-request-reactivation.hook";

const fetchMock = jest.fn();
const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

jest.mock("@/services/api", () => {
  const actual = jest.requireActual("@/services/api");

  return { ...actual, apiPost: jest.fn(actual.apiPost) };
});

const user = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "deleted",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
};

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SessionProvider>{children}</SessionProvider>
  </QueryClientProvider>
);

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

const renderSignedIn = async () => {
  const hook = await renderHook(
    () => ({ session: useSession(), request: useRequestReactivation() }),
    { wrapper },
  );

  await act(async () =>
    hook.result.current.session.setSession({ user, tokens }),
  );

  return hook;
};

const request = async (hook: Awaited<ReturnType<typeof renderSignedIn>>) => {
  await act(async () => {
    await hook.result.current.request.mutateAsync().catch(() => {});
    // React Query notifies its observers on a timer.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { gcTime: Infinity } },
  });
  fetchMock.mockReset();
  mockShow.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("useRequestReactivation", () => {
  it("success puts the returned account in the session", async () => {
    respond(200, { ...user, reactivationStatus: "requested" });
    const hook = await renderSignedIn();

    await request(hook);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/auth/me/reactivation-request",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer at-1" }),
      }),
    );
    expect(hook.result.current.session.user?.reactivationStatus).toBe(
      "requested",
    );
    expect(hook.result.current.session.tokens).toEqual(tokens);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("denied marks the session's account as denied", async () => {
    respond(409, { errors: ["user.reactivation.denied"] });
    const hook = await renderSignedIn();

    await request(hook);

    expect(hook.result.current.session.user).toEqual({
      ...user,
      reactivationStatus: "denied",
    });
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("session expired shows the toast and signs out", async () => {
    respond(401, { errors: ["auth.token.invalid"] });
    const hook = await renderSignedIn();

    await request(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Your session expired. Sign in again.",
    );
    expect(hook.result.current.session.user).toBeNull();
  });

  it("account changed shows the toast and signs out", async () => {
    respond(403, { errors: ["user.status.notDeleted"] });
    const hook = await renderSignedIn();

    await request(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Your account changed. Sign in again to continue.",
    );
    expect(hook.result.current.session.user).toBeNull();
  });

  it("no connection shows the toast and keeps the session", async () => {
    fetchMock.mockRejectedValue(new TypeError("offline"));
    const hook = await renderSignedIn();

    await request(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "No connection. Check your internet and try again.",
    );
    expect(hook.result.current.session.user).toEqual(user);
    expect(hook.result.current.request.isPending).toBe(false);
  });

  it.each([
    [500, { errors: [] }],
    [409, { errors: ["something.else"] }],
    [403, { errors: ["something.else"] }],
  ])("other error (%s) shows the generic toast", async (status, body) => {
    respond(status, body);
    const hook = await renderSignedIn();

    await request(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
    expect(hook.result.current.session.user).toEqual(user);
  });

  it("other error shows the generic toast for an unexpected failure", async () => {
    jest.mocked(apiPost).mockRejectedValueOnce(new Error("boom"));
    const hook = await renderSignedIn();

    await request(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
    expect(hook.result.current.session.user).toEqual(user);
  });

  it("success without a session leaves the session empty", async () => {
    respond(200, { ...user, reactivationStatus: "requested" });
    const hook = await renderHook(
      () => ({ session: useSession(), request: useRequestReactivation() }),
      { wrapper },
    );

    await request(hook);

    expect(hook.result.current.session.user).toBeNull();
  });

  it("denied without a session shows the generic toast", async () => {
    respond(409, { errors: ["user.reactivation.denied"] });
    const hook = await renderHook(
      () => ({ session: useSession(), request: useRequestReactivation() }),
      { wrapper },
    );

    await request(hook);

    expect(mockShow).toHaveBeenCalledWith(
      "Something went wrong. Please try again.",
    );
    expect(hook.result.current.session.user).toBeNull();
  });
});
