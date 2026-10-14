import { render, screen, userEvent } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Appearance } from "react-native";

import { setThemePreference } from "@/services/preferences/theme-preference";

import { ThemeSheet } from "./theme-sheet.component";

jest.useFakeTimers();

describe("ThemeSheet", () => {
  beforeEach(async () => {
    jest
      .spyOn(Appearance, "setColorScheme")
      .mockImplementation(() => undefined);
    setThemePreference("system");
  });

  afterEach(() => jest.restoreAllMocks());

  it("lists the three choices with the current one checked", async () => {
    await render(<ThemeSheet visible onClose={jest.fn()} />);

    expect(screen.getByText("Theme")).toBeOnTheScreen();
    expect(
      screen.getByText("Until you choose, the app follows your phone's theme."),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("button", { selected: true })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /Same as phone/, selected: true }),
    ).toBeOnTheScreen();
    expect(screen.getByText("Light")).toBeOnTheScreen();
    expect(screen.getByText("Dark")).toBeOnTheScreen();
  });

  it("applies, stores and closes when a choice is pressed", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<ThemeSheet visible onClose={onClose} />);

    await user.press(screen.getByText("Dark"));

    expect(Appearance.setColorScheme).toHaveBeenCalledWith("dark");
    expect(SecureStore.getItem("prefs.theme")).toBe("dark");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: /Dark/, selected: true }),
    ).toBeOnTheScreen();
  });

  it("goes back to following the phone", async () => {
    const user = userEvent.setup();
    setThemePreference("dark");
    await render(<ThemeSheet visible onClose={jest.fn()} />);

    await user.press(screen.getByText("Same as phone"));

    expect(Appearance.setColorScheme).toHaveBeenLastCalledWith("unspecified");
  });
});
