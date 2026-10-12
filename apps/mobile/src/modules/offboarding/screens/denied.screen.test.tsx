import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";

import i18n from "@/i18n";
import { SessionContext } from "@/providers/session/session.context";
import type { SessionUser } from "@/navigation/resolve-flow.types";

import { DeniedScreen } from "./denied.screen";

const fetchMock = jest.fn();
const clearSession = jest.fn();

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const deniedUser = (denialReason: string | null): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "denied",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason,
  reactivationStatus: null,
});

const renderDenied = async (denialReason: string | null) => {
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <SessionContext.Provider
        value={{
          user: deniedUser(denialReason),
          tokens,
          setSession: jest.fn(),
          clearSession,
        }}
      >
        <DeniedScreen />
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

describe("DeniedScreen", () => {
  it("shows the denial with a reason, exactly as stored", async () => {
    await renderDenied("Not enough info.\nCafé closed");

    expect(screen.getByText("Registration not approved")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Not this time" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("ana.silva@gmail.com")).toBeOnTheScreen();
    expect(screen.getByText("Message from the team")).toBeOnTheScreen();
    expect(screen.getByText("Not enough info.\nCafé closed")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Back")).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Contact the school" }),
    ).toBeOnTheScreen();
  });

  it.each([null, "   "])(
    "has no note without a reason (%p)",
    async (reason) => {
      await renderDenied(reason);

      expect(
        screen.getByRole("header", { name: "Not this time" }),
      ).toBeOnTheScreen();
      expect(screen.queryByText("Message from the team")).not.toBeOnTheScreen();
    },
  );

  it("signs out through use another email", async () => {
    await renderDenied(null);

    await userEvent.press(
      screen.getByRole("button", { name: "Use another email" }),
    );

    expect(clearSession).toHaveBeenCalledTimes(1);
  });

  it("shows the spanish copy and keeps the reason as stored", async () => {
    await i18n.changeLanguage("es-ES");
    await renderDenied("Razón en portugués");

    expect(
      screen.getByRole("header", { name: "Esta vez no ha sido posible" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Mensaje del equipo")).toBeOnTheScreen();
    expect(screen.getByText("Razón en portugués")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Usar otro email" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Hablar con la escuela" }),
    ).toBeOnTheScreen();
  });
});
