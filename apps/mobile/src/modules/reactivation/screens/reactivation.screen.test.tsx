import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";

import i18n from "@/i18n";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { SessionProvider, useSession } from "@/providers/session";
import { SessionContext } from "@/providers/session/session.context";
import { hydrateSession } from "@/services/session/session.store";

import { ReactivationScreen } from "./reactivation.screen";

const fetchMock = jest.fn();
const mockShow = jest.fn();

jest.mock("@/providers/alert-message", () => ({
  useAlertMessage: () => ({ show: mockShow }),
}));

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2099-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

const deletedUser = (
  reactivationStatus: string | null,
  denialReason: string | null = null,
): SessionUser => ({
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "deleted",
  createdAt: "2026-10-10T12:00:00.000Z",
  photoUrl: null,
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason,
  reactivationStatus,
});

// The real session, seeded with the deleted account as after signing in; the account is gone after a sign-out.
function SignedIn() {
  const { user } = useSession();

  return user ? <ReactivationScreen /> : <Text>Signed out</Text>;
}

const renderScreen = async (
  status: string | null = null,
  denialReason: string | null = null,
) => {
  hydrateSession({ user: deletedUser(status, denialReason), tokens });
  await render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { gcTime: Infinity },
            mutations: { gcTime: Infinity },
          },
        })
      }
    >
      <SessionProvider>
        <SignedIn />
      </SessionProvider>
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

  it("denied shows the team's reason exactly as written", async () => {
    await renderScreen("denied", "  Turmas cheias.\nTente em março.  ");

    expect(screen.getByText("Message from the team")).toBeOnTheScreen();
    expect(
      screen.getByText("  Turmas cheias.\nTente em março.  "),
    ).toBeOnTheScreen();
  });

  it.each([null, "", "   "])(
    "denied with reason %p shows no note",
    async (reason) => {
      await renderScreen("denied", reason);

      expect(screen.queryByText("Message from the team")).not.toBeOnTheScreen();
    },
  );

  it.each([null, "requested"])(
    "the %p state never shows the note, even with a stored reason",
    async (status) => {
      await renderScreen(status, "Turmas cheias.");

      expect(screen.queryByText("Message from the team")).not.toBeOnTheScreen();
      expect(screen.queryByText("Turmas cheias.")).not.toBeOnTheScreen();
    },
  );

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

  it("still renders while the session is being cleared", async () => {
    await render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: {
              queries: { gcTime: Infinity },
              mutations: { gcTime: Infinity },
            },
          })
        }
      >
        <SessionContext.Provider
          value={{
            user: null,
            tokens: null,
            setSession: jest.fn(),
            clearSession: jest.fn(),
            isRestoring: false,
            updateUser: jest.fn(),
          }}
        >
          <ReactivationScreen />
        </SessionContext.Provider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("header", { name: "This account is no longer active" }),
    ).toBeOnTheScreen();
  });
});
