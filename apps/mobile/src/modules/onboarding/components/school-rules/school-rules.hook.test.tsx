import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionContext } from "@/providers/session/session.context";

import { useSchoolRulesStep } from "./school-rules.hook";

const fetchMock = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: jest.fn() }),
}));

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: Infinity } },
      })
    }
  >
    <SessionContext.Provider
      value={{
        user: null,
        tokens,
        setSession: jest.fn(),
        clearSession: jest.fn(),
      }}
    >
      {children}
    </SessionContext.Provider>
  </QueryClientProvider>
);

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("useSchoolRulesStep", () => {
  it("sends nothing while the box is unticked or the rules aren't loaded", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ version: 3, rules: [] }),
    });
    const { result } = await renderHook(() => useSchoolRulesStep(), {
      wrapper,
    });

    // Rules not loaded yet.
    await act(async () => result.current.submit());
    await waitFor(() => expect(result.current.canAccept).toBe(true));
    // Loaded, box unticked.
    await act(async () => result.current.submit());

    expect(
      fetchMock.mock.calls.filter(([url]) => url.endsWith("/acceptances")),
    ).toHaveLength(0);
    expect(result.current.canSubmit).toBe(false);
  });
});
