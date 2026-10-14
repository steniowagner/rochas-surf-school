import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

import { hydrateSession } from "@/services/session/session.store";

import { Person } from "./people.types";

export const fetchMock = jest.fn();

export const buildPerson = (index: number, overrides: Partial<Person> = {}): Person => ({
  id: `p-${index}`,
  name: `Person ${index}`,
  role: "student",
  createdAt: "2026-07-15T12:00:00.000Z",
  whatsappNumber: null,
  ...overrides,
});

export const buildPage = (
  page: number,
  count: number,
  total: number,
  firstIndex = (page - 1) * 20,
) => ({
  items: Array.from({ length: count }, (_, i) => buildPerson(firstIndex + i)),
  page,
  perPage: 20,
  total,
});

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity } },
  });

export const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

export const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

export const failure = (status = 500) => ({
  ok: false,
  status,
  json: async () => ({ errors: [] }),
});

export const requestedPaths = (): string[] =>
  fetchMock.mock.calls.map(([url]) => String(url).replace("http://api.test", ""));

export const setupSignedInUser = () => {
  hydrateSession({
    user: { id: "u-1", role: "student", status: "approved" } as never,
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
};
