import { render, screen } from "@testing-library/react-native";
import * as SplashScreen from "expo-splash-screen";
import { Text } from "react-native";

import { SessionProvider } from "@/providers/session";
import { resetSessionStore } from "@/services/session/session.store";

import { SplashGate } from "./splash-gate.component";

jest.mock("expo-splash-screen", () => ({
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  resetSessionStore();
  jest.mocked(SplashScreen.hideAsync).mockClear();
});

const renderGate = (fontsReady: boolean) =>
  render(
    <SessionProvider>
      <SplashGate fontsReady={fontsReady}>
        <Text>app</Text>
      </SplashGate>
    </SessionProvider>,
  );

describe("SplashGate", () => {
  it("renders the app and hides the splash screen once fonts and restore are done", async () => {
    await renderGate(true);

    expect(await screen.findByText("app")).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  });

  it("keeps the splash screen while the fonts are loading", async () => {
    await renderGate(false);

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(screen.queryByText("app")).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
