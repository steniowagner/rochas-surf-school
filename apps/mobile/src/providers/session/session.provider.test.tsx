import { render, screen, userEvent } from "@testing-library/react-native";
import { Text, TouchableOpacity } from "react-native";

import { SessionProvider } from "./session.provider";
import { useSession } from "./use-session";

const ana = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "approved",
  createdAt: "2026-10-10T12:00:00.000Z",
};

const tokensOf = {
  accessToken: "access-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "refresh-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

function Probe() {
  const { user, tokens, setSession, clearSession } = useSession();

  return (
    <>
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

describe("SessionProvider", () => {
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
