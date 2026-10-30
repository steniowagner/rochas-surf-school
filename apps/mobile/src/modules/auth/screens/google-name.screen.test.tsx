import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider, useSession } from "@/providers/session";

import { GoogleNameScreen } from "./google-name.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.useFakeTimers();

const ACCOUNT = {
  id: "1",
  name: "Maria Souza",
  email: "maria@gmail.com",
  role: "student",
  status: "pending",
  createdAt: "2026-10-10T12:00:00.000Z",
  photoUrl: null,
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
};

const TOKENS = {
  accessToken: "a",
  accessTokenExpiresAt: "2026-01-01T00:00:00.000Z",
  refreshToken: "r",
  refreshTokenExpiresAt: "2026-02-01T00:00:00.000Z",
};

const fetchMock = jest.fn();

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

function SessionUserProbe() {
  const { user, tokens } = useSession();

  return (
    <Text>
      {user ? `session: ${JSON.stringify({ user, tokens })}` : "no session"}
    </Text>
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
          <GoogleNameScreen />
          <SessionUserProbe />
        </SessionProvider>
      </AlertMessageProvider>
    </QueryClientProvider>,
  );

beforeEach(() => {
  jest
    .mocked(useLocalSearchParams)
    .mockReturnValue({ idToken: "token", name: "Maria" });
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("GoogleNameScreen", () => {
  it("fills the field with Google's name from the route", async () => {
    await renderScreen();

    expect(
      screen.getByPlaceholderText("First and last name"),
    ).toHaveDisplayValue("Maria");
  });

  it("treats an empty name param as no name", async () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ idToken: "token", name: "" });

    await renderScreen();

    expect(
      screen.getByPlaceholderText("First and last name"),
    ).toHaveDisplayValue("");
  });

  it("sends the token from the route and puts the answer in the session", async () => {
    jest
      .mocked(useLocalSearchParams)
      .mockReturnValue({ idToken: "token", name: "Maria Souza" });
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ...TOKENS, user: ACCOUNT }),
    );
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.getByText("no session")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(
        screen.getByText(
          `session: ${JSON.stringify({ user: ACCOUNT, tokens: TOKENS })}`,
        ),
      ).toBeOnTheScreen(),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      idToken: "token",
      name: "Maria Souza",
    });
  });
});
