import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { useState } from "react";
import { Text } from "react-native";

import i18n from "@/i18n";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { SessionContext } from "@/providers/session/session.context";
import type {
  Session,
  SessionContextValue,
} from "@/providers/session/session.types";

import { ReactivationScreen } from "./reactivation.screen";

const fetchMock = jest.fn();
const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const deletedUser = (reactivationStatus: string | null): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "deleted",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus,
});

// A session that already holds the deleted account, as after signing in; the account is gone after a sign-out.
function SignedIn({ status }: { status: string | null }) {
  const [session, setSession] = useState<Session | null>({
    user: deletedUser(status),
    tokens,
  });
  const value: SessionContextValue = {
    user: session?.user ?? null,
    tokens: session?.tokens ?? null,
    setSession,
    clearSession: () => setSession(null),
  };

  return (
    <SessionContext.Provider value={value}>
      {session ? <ReactivationScreen /> : <Text>Signed out</Text>}
    </SessionContext.Provider>
  );
}

const renderScreen = async (status: string | null = null) => {
  await render(
    <QueryClientProvider client={new QueryClient()}>
      <SignedIn status={status} />
    </QueryClientProvider>,
  );
};

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

beforeEach(() => {
  fetchMock.mockReset();
  mockShow.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("ReactivationScreen", () => {
  it("not requested shows the deleted account and the request button", async () => {
    await renderScreen();

    expect(screen.getByText("Account deleted")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "This account is no longer active" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("ana.silva@gmail.com")).toBeOnTheScreen();
    expect(screen.getByText("How to reactivate")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Request reactivation" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Use another email" }),
    ).toBeOnTheScreen();
  });

  it("request switches to the requested state in place", async () => {
    respond(200, { ...deletedUser("requested") });
    await renderScreen();

    await userEvent.press(
      screen.getByRole("button", { name: "Request reactivation" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("header", { name: "The team will review it" }),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.queryByRole("button", { name: "Request reactivation" }),
    ).not.toBeOnTheScreen();
  });

  it("request sends one request on a double tap", async () => {
    let answer: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await renderScreen();
    const button = screen.getByRole("button", { name: "Request reactivation" });

    await userEvent.press(button);
    await userEvent.press(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    answer({
      ok: true,
      status: 200,
      json: async () => deletedUser("requested"),
    });
    await waitFor(() =>
      expect(screen.getByText("Request sent")).toBeOnTheScreen(),
    );
  });

  it("requested shows the waiting state without a primary button", async () => {
    await renderScreen("requested");

    expect(screen.getByText("Request sent")).toBeOnTheScreen();
    expect(screen.getByText("What now?")).toBeOnTheScreen();
    expect(screen.getByText("ana.silva@gmail.com")).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Request reactivation" }),
    ).not.toBeOnTheScreen();
  });

  it("denied shows only use another email, as stored", async () => {
    await renderScreen("denied");

    expect(screen.getByText("Request denied")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Couldn't reactivate" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("How to reactivate")).not.toBeOnTheScreen();
    expect(screen.queryByText("What now?")).not.toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("denied after a 409 switches the screen in place", async () => {
    respond(409, { errors: ["user.reactivation.denied"] });
    await renderScreen();

    await userEvent.press(
      screen.getByRole("button", { name: "Request reactivation" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("header", { name: "Couldn't reactivate" }),
      ).toBeOnTheScreen(),
    );
  });

  it.each([null, "requested", "denied"])(
    "use another email signs out (%p)",
    async (status) => {
      await renderScreen(status);

      await userEvent.press(
        screen.getByRole("button", { name: "Use another email" }),
      );

      expect(screen.getByText("Signed out")).toBeOnTheScreen();
    },
  );

  it("spanish shows the es-ES copy in each state", async () => {
    await i18n.changeLanguage("es-ES");
    await renderScreen();

    expect(
      screen.getByRole("header", { name: "Esta cuenta ya no está activa" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Pedir reactivación" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Usar otro email" }),
    ).toBeOnTheScreen();
  });

  it("spanish shows the requested and denied copy", async () => {
    await i18n.changeLanguage("es-ES");
    await renderScreen("requested");

    expect(
      screen.getByRole("header", { name: "El equipo la revisará" }),
    ).toBeOnTheScreen();

    await renderScreen("denied");

    expect(
      screen.getAllByRole("header", { name: "No fue posible reactivarla" }),
    ).not.toHaveLength(0);
  });
});
