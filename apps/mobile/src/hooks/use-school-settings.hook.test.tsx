import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { hydrateSession } from "@/services/session/session.store";

import { useSchoolSettings } from "./use-school-settings.hook";

const fetchMock = jest.fn();

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

beforeEach(() => {
  hydrateSession({
    user: { id: "user-1" } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
    },
  });
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("useSchoolSettings", () => {
  it("reads the number and the waiting-list switch, asking with the access token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        whatsappNumber: "+5585999998888",
        waitingListEnabled: false,
      }),
    });

    const { result } = await renderHook(() => useSchoolSettings(), { wrapper });

    await waitFor(() =>
      expect(result.current.data).toEqual({
        whatsappNumber: "+5585999998888",
        waitingListEnabled: false,
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-settings", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("fails once, without retrying", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });

    const { result } = await renderHook(() => useSchoolSettings(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
