import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { StrictMode } from "react";
import { Text, TouchableOpacity } from "react-native";

import {
  resetSessionStore,
  setSession as storeSetSession,
} from "@/services/session/session.store";

import { SessionProvider } from "./session.provider";
import { useSession } from "./use-session";

const ana = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "approved",
  createdAt: "2026-10-10T12:00:00.000Z",
  photoUrl: null,
  whatsappNumber: null,
  whatsappVisible: false,
  rulesAccepted: false,
  rulesAcceptedBefore: false,
  denialReason: null,
  reactivationStatus: null,
};

const tokensOf = {
  accessToken: "access-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "refresh-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

function Probe() {
  const { user, tokens, isRestoring, setSession, updateUser, clearSession } =
    useSession();

  return (
    <>
      <Text>{isRestoring ? "restoring" : "restored"}</Text>
      <TouchableOpacity onPress={() => updateUser({ ...ana, name: "Ana B" })}>
        <Text>rename</Text>
      </TouchableOpacity>
      <Text>{user ? `name ${user.name}` : "no name"}</Text>
      <Text>{user ? `signed in as ${user.email}` : "signed out"}</Text>
      <Text>{tokens ? `refresh ${tokens.refreshToken}` : "no tokens"}</Text>
      <TouchableOpacity
        onPress={() => setSession({ user: ana, tokens: tokensOf })}
      >
        <Text>sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={clearSession}>
        <Text>sign out</Text>
      </TouchableOpacity>
    </>
  );
}

const fetchMock = jest.fn();

beforeEach(async () => {
  resetSessionStore();
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("SessionProvider", () => {
  it("is restoring until the stored session is read", async () => {
    await SecureStore.setItemAsync(
      "session.tokens",
      JSON.stringify({
        ...tokensOf,
        accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
      }),
    );
    await SecureStore.setItemAsync("session.user", JSON.stringify(ana));
    let answer!: (value: unknown) => void;
    fetchMock.mockReturnValue(new Promise((resolve) => (answer = resolve)));

    await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByText("restoring")).toBeOnTheScreen();

    answer({
      ok: true,
      status: 200,
      json: async () => ({ ...ana, name: "Ana Reloaded" }),
    });

    expect(await screen.findByText("restored")).toBeOnTheScreen();
    expect(screen.getByText("name Ana Reloaded")).toBeOnTheScreen();
    expect(
      screen.getByText("signed in as ana.silva@gmail.com"),
    ).toBeOnTheScreen();
  });

  it("finishes restoring signed out with nothing stored", async () => {
    await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await waitFor(() => expect(screen.getByText("restored")).toBeOnTheScreen());
    expect(screen.getByText("signed out")).toBeOnTheScreen();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("starts the restore once even when effects run twice", async () => {
    await SecureStore.setItemAsync(
      "session.tokens",
      JSON.stringify({
        ...tokensOf,
        accessTokenExpiresAt: "2099-01-01T00:00:00.000Z",
      }),
    );
    await SecureStore.setItemAsync("session.user", JSON.stringify(ana));
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ana,
    });

    await render(
      <StrictMode>
        <SessionProvider>
          <Probe />
        </SessionProvider>
      </StrictMode>,
    );

    expect(await screen.findByText("restored")).toBeOnTheScreen();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("updates the account and keeps the tokens", async () => {
    storeSetSession({ user: ana, tokens: tokensOf });
    const user = userEvent.setup();
    await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await user.press(screen.getByText("rename"));

    expect(screen.getByText("name Ana B")).toBeOnTheScreen();
    expect(screen.getByText("refresh refresh-1")).toBeOnTheScreen();
  });

  it("starts with no user", async () => {
    await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    expect(screen.getByText("signed out")).toBeOnTheScreen();
  });

  it("sets the session and clears it", async () => {
    const user = userEvent.setup();
    await render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );

    await user.press(screen.getByText("sign in"));
    expect(
      screen.getByText("signed in as ana.silva@gmail.com"),
    ).toBeOnTheScreen();
    expect(screen.getByText("refresh refresh-1")).toBeOnTheScreen();

    await user.press(screen.getByText("sign out"));
    expect(screen.getByText("signed out")).toBeOnTheScreen();
    expect(screen.getByText("no tokens")).toBeOnTheScreen();
  });

  it("throws when useSession is used without the provider", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(render(<Probe />)).rejects.toThrow(
      "useSession must be used inside SessionProvider",
    );

    jest.mocked(console.error).mockRestore();
  });
});
