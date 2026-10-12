import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { ReactNode } from "react";

import { SessionContext } from "@/providers/session/session.context";

import { useSchoolWhatsapp } from "./use-school-whatsapp.hook";

const fetchMock = jest.fn();

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
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

describe("useSchoolWhatsapp", () => {
  it("returns the number, asking with the access token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ whatsappNumber: "+5585999998888" }),
    });

    const { result } = await renderHook(() => useSchoolWhatsapp(), { wrapper });

    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe("+5585999998888"));
    expect(fetchMock).toHaveBeenCalledWith("http://api.test/school-settings", {
      method: "GET",
      headers: { Authorization: "Bearer at-1" },
    });
  });

  it("returns null when the school has no number", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ whatsappNumber: null }),
    });

    const { result } = await renderHook(() => useSchoolWhatsapp(), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });

  it("returns null on an error, without retrying", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ errors: [] }),
    });

    const { result } = await renderHook(() => useSchoolWhatsapp(), { wrapper });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });
});
