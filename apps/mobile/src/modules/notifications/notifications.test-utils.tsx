import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

import { hydrateSession } from "@/services/session/session.store";

import { NotificationItem } from "./notifications.types";

export const fetchMock = jest.fn();

export const buildNotification = (
  index: number,
  overrides: Partial<NotificationItem> = {},
): NotificationItem => ({
  id: `n-${index}`,
  type: "enrolment.approved",
  classId: `c-${index}`,
  title: `Title ${index}`,
  body: `Body ${index}`,
  createdAt: "2026-10-20T12:00:00.000Z",
  read: false,
  ...overrides,
});

export const buildPage = (
  page: number,
  count: number,
  total: number,
  firstIndex = (page - 1) * 20,
  overrides: Partial<NotificationItem> = {},
) => ({
  items: Array.from({ length: count }, (_, i) => buildNotification(firstIndex + i, overrides)),
  page,
  perPage: 20,
  total,
});

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
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

export const noContent = () => ({
  ok: true,
  status: 204,
  json: async () => {
    throw new SyntaxError("no body");
  },
});

export const failure = (status = 500) => ({
  ok: false,
  status,
  json: async () => ({ errors: [] }),
});

export const requests = (): { method: string; path: string }[] =>
  fetchMock.mock.calls.map(([url, init]) => ({
    method: (init as RequestInit | undefined)?.method ?? "GET",
    path: String(url).replace("http://api.test", ""),
  }));

export const setupSignedInUser = (role = "student") => {
  hydrateSession({
    user: { id: "u-1", role, status: "approved" } as never,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2099-11-10T12:00:00.000Z",
    },
  });
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
};
