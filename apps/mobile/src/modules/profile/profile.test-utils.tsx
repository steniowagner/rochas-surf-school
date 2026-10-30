import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import { ReactElement } from "react";

import type { SessionUser } from "@/navigation/resolve-flow.types";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider } from "@/providers/session";
import { hydrateSession } from "@/services/session/session.store";

export const account = (overrides: Partial<SessionUser> = {}): SessionUser => ({
  id: "user-1",
  name: "Ana Souza",
  email: "ana@example.com",
  role: "student",
  status: "approved",
  createdAt: "2026-10-01T10:00:00.000Z",
  photoUrl: null,
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: true,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
  ...overrides,
});

export const seedSession = (user: SessionUser = account()) =>
  hydrateSession({
    user,
    tokens: {
      accessToken: "at-1",
      accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
      refreshToken: "rt-1",
      refreshTokenExpiresAt: "2099-11-10T12:00:00.000Z",
    },
  });

export const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

/** Renders under the providers the profile screens need: query client, toast and session. */
export const renderWithProviders = (ui: ReactElement) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <AlertMessageProvider>
        <SessionProvider>{ui}</SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>,
  );

export const setupFetch = () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  return fetchMock;
};
