import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";

import i18n from "@/i18n";
import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider, useSession } from "@/providers/session";

import { ConfirmCodeScreen } from "./confirm-code.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: () => ({
    email: "ana.silva@gmail.com",
    name: "Ana Silva",
  }),
}));
jest.useFakeTimers();

const ACCOUNT = {
  id: "1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "pending",
};

const fetchMock = jest.fn();

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

function SessionUserProbe() {
  const { user } = useSession();

  return (
    <Text>{user ? `session: ${JSON.stringify(user)}` : "no session"}</Text>
  );
}

const renderScreen = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <AlertMessageProvider>
        <SessionProvider>
          <ConfirmCodeScreen />
          <SessionUserProbe />
        </SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>,
  );

const enterCode = () =>
  fireEvent.changeText(
    screen.getByLabelText(i18n.t("confirmCode.inputLabel")),
    "123456",
  );

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("ConfirmCodeScreen", () => {
  it("renders with the params of the route", async () => {
    await renderScreen();

    expect(
      screen.getByRole("header", { name: "Confirm your email" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("ana.silva@gmail.com")).toBeOnTheScreen();
  });

  it("puts the verified account in the session", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        accessToken: "a",
        accessTokenExpiresAt: "2026-01-01T00:00:00.000Z",
        refreshToken: "r",
        refreshTokenExpiresAt: "2026-02-01T00:00:00.000Z",
        user: ACCOUNT,
      }),
    );
    await renderScreen();

    await enterCode();

    expect(
      await screen.findByText(`session: ${JSON.stringify(ACCOUNT)}`),
    ).toBeOnTheScreen();
  });

  it.each([
    ["a wrong code", 401, "signInCode.code.invalid", "Wrong code. Try again."],
    [
      "a server error",
      500,
      "INTERNAL_SERVER_ERROR",
      "Something went wrong. Please try again.",
    ],
  ])(
    "keeps the session empty when the check fails (%s)",
    async (_case, status, key, message) => {
      fetchMock.mockResolvedValue(jsonResponse(status, { errors: [key] }));
      await renderScreen();

      await enterCode();

      expect(
        await screen.findByText(message, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(screen.getByText("no session")).toBeOnTheScreen();
      expect(
        screen.getByRole("header", { name: "Confirm your email" }),
      ).toBeOnTheScreen();
    },
  );
});
