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
};

function Probe() {
  const { user, setUser, clearUser } = useSession();

  return (
    <>
      <Text>{user ? `signed in as ${user.email}` : "signed out"}</Text>
      <TouchableOpacity onPress={() => setUser(ana)}>
        <Text>sign in</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={clearUser}>
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

  it("sets the user and clears it", async () => {
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

    await user.press(screen.getByText("sign out"));
    expect(screen.getByText("signed out")).toBeOnTheScreen();
  });

  it("throws when useSession is used without the provider", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(render(<Probe />)).rejects.toThrow(
      "useSession must be used inside SessionProvider",
    );

    jest.mocked(console.error).mockRestore();
  });
});
