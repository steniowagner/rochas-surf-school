import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionContext } from "@/providers/session/session.context";

import { useSchoolRules } from "./use-school-rules.hook";

const fetchMock = jest.fn();
const mockShow = jest.fn();
const clearSession = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <SessionContext.Provider
      value={{
        user: null,
        tokens,
        setSession: jest.fn(),
        clearSession,
        isRestoring: false,
        updateUser: jest.fn(),
      }}
    >
      {children}
    </SessionContext.Provider>
  </QueryClientProvider>
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
  clearSession.mockReset();
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

  it("signs out when the session expired", async () => {
    respond(401, { errors: ["auth.token.invalid"] });

    await renderHook(
      () => ({ first: useSchoolRules(), second: useSchoolRules() }),
      { wrapper },
    );

    await waitFor(() => expect(clearSession).toHaveBeenCalledTimes(1));
    expect(mockShow).toHaveBeenCalledTimes(1);
    expect(mockShow).toHaveBeenCalledWith(
      "Your session expired. Sign in again.",
    );
    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("keeps the session on another error", async () => {
    respond(500, { errors: [] });

    const { result } = await renderHook(() => useSchoolRules(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShow).not.toHaveBeenCalled();
    expect(clearSession).not.toHaveBeenCalled();
  });
});
