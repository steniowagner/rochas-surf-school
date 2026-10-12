import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { getSnapshot, hydrateSession } from "@/services/session/session.store";

import { useSchoolRules } from "./use-school-rules.hook";

const fetchMock = jest.fn();
const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });
  fetchMock.mockReset();
  mockShow.mockReset();
  hydrateSession({ user: { id: "user-1" } as never, tokens });
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("useSchoolRules", () => {
  it("sends the access token", async () => {
    respond(200, { version: 1, rules: [] });

    const { result } = await renderHook(() => useSchoolRules(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-rules", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
    expect(result.current.data).toEqual({ version: 1, rules: [] });
  });

  it("fails without a message of its own when the session expired", async () => {
    respond(401, { errors: ["auth.token.invalid"] });

    const { result } = await renderHook(
      () => ({ first: useSchoolRules(), second: useSchoolRules() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.first.isError).toBe(true));
    // The message is shown once, for the whole app, by useSessionExpired.
    expect(mockShow).not.toHaveBeenCalled();
    expect(getSnapshot().expired).toBe(true);
  });

  it("keeps the session on another error", async () => {
    respond(500, { errors: [] });

    const { result } = await renderHook(() => useSchoolRules(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShow).not.toHaveBeenCalled();
    expect(getSnapshot().session).not.toBeNull();
    expect(getSnapshot().expired).toBe(false);
  });
});
