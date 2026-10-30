import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { Text } from "react-native";

import { AlertMessageProvider } from "@/providers/alert-message";
import { SessionProvider, useSession } from "@/providers/session";

import { AuthScreen } from "./auth.screen";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.useFakeTimers();

const ACCOUNT = {
  id: "1",
  name: "Maria Silva",
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

function SessionUserProbe() {
  const { user, tokens } = useSession();

  return (
    <Text>
      {user ? `session: ${JSON.stringify({ user, tokens })}` : "no session"}
    </Text>
  );
}

describe("AuthScreen", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  it("signs in with Google and puts the answer in the session", async () => {
    jest.mocked(GoogleSignin.signIn).mockResolvedValue({
      type: "success",
      data: { idToken: "id-token", user: { name: "Maria Silva" } },
    } as never);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...TOKENS, user: ACCOUNT }),
    });
    const user = userEvent.setup();
    await render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { mutations: { retry: false } } })
        }
      >
        <AlertMessageProvider>
          <SessionProvider>
            <AuthScreen />
            <SessionUserProbe />
          </SessionProvider>
        </AlertMessageProvider>
      </QueryClientProvider>,
    );
    expect(screen.getByText("no session")).toBeOnTheScreen();

    await user.press(screen.getByText("Continue with Google"));

    await waitFor(() =>
      expect(
        screen.getByText(
          `session: ${JSON.stringify({ user: ACCOUNT, tokens: TOKENS })}`,
        ),
      ).toBeOnTheScreen(),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      idToken: "id-token",
    });
  });
});
