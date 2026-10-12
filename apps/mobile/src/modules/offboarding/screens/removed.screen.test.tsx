import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { SessionContext } from "@/providers/session/session.context";

import { RemovedScreen } from "./removed.screen";

const fetchMock = jest.fn();
const clearSession = jest.fn();

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const removedUser = (reactivationStatus: string | null): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "removed",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus,
});

const renderRemoved = async (
  reactivationStatus: string | null = null,
  signedIn = true,
) => {
  await render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
      }
    >
      <SessionContext.Provider
        value={{
          user: signedIn ? removedUser(reactivationStatus) : null,
          tokens,
          setSession: jest.fn(),
          clearSession,
        }}
      >
        <RemovedScreen />
      </SessionContext.Provider>
    </QueryClientProvider>,
  );

  // Let the school's number load, so the query doesn't settle outside the test.
  await screen.findByRole("button", { name: /school|escuela/i });
};

beforeEach(() => {
  fetchMock.mockReset();
  clearSession.mockReset();
  fetchMock.mockImplementation(async (url: string) => ({
    ok: true,
    status: url.endsWith("/school-settings") ? 200 : 204,
    json: async () => ({ whatsappNumber: "+5585999998888" }),
  }));
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("RemovedScreen", () => {
  it("shows the removal, the questions card and the contact button", async () => {
    await renderRemoved();

    expect(screen.getByText("Access removed")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", {
        name: "You no longer have access to the app",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByText("ana.silva@gmail.com")).toBeOnTheScreen();
    expect(screen.getByText("Questions?")).toBeOnTheScreen();
    expect(
      screen.getByText("Talk to the school directly on WhatsApp."),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Contact the school" }),
    ).toBeOnTheScreen();
  });

  it("offers no reactivation, even with a stored request", async () => {
    await renderRemoved("denied");

    expect(screen.getByText("Access removed")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: /request reactivation/i }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText("Request denied")).not.toBeOnTheScreen();
  });

  it("signs out through use another email", async () => {
    await renderRemoved();

    await userEvent.press(
      screen.getByRole("button", { name: "Use another email" }),
    );

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("shows the spanish copy", async () => {
    await i18n.changeLanguage("es-ES");
    await renderRemoved();

    expect(
      screen.getByRole("header", { name: "Ya no tienes acceso a la app" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("¿Tienes dudas?")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Usar otro email" }),
    ).toBeOnTheScreen();
  });

  it("still renders while the session is being cleared", async () => {
    await renderRemoved(null, false);

    expect(
      screen.getByRole("header", {
        name: "You no longer have access to the app",
      }),
    ).toBeOnTheScreen();
  });
});
