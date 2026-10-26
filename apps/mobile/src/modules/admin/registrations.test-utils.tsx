import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

import { hydrateSession } from "@/services/session/session.store";

export const fetchMock = jest.fn();

export const ANA = {
  id: "a",
  name: "Ana Souza",
  email: "ana@x.com",
  createdAt: "2026-10-01T10:00:00.000Z",
};
export const BRUNO = {
  id: "b",
  name: "Bruno Lima",
  email: "bruno@x.com",
  createdAt: "2026-10-02T10:00:00.000Z",
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });

export const createWrapper = (queryClient: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

export const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

export const setupSignedInAdmin = () => {
  hydrateSession({
    user: { id: "admin-1", role: "admin", status: "approved" } as never,
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

export const CARLA = {
  id: "c",
  name: "Carla Dias",
  email: "carla@x.com",
  role: "student" as const,
  deletedAt: "2026-10-01T10:00:00.000Z",
  requestedAt: "2026-10-05T10:00:00.000Z",
  classesTaken: 8,
};
export const DAVI = {
  id: "d",
  name: "Davi Reis",
  email: "davi@x.com",
  role: "instructor" as const,
  deletedAt: "2026-10-02T10:00:00.000Z",
  requestedAt: "2026-10-06T10:00:00.000Z",
  classesTaken: 1,
};
