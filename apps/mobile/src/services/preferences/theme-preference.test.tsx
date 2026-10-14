import { act, renderHook } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { Appearance } from "react-native";

import {
  applyStoredThemePreference,
  setThemePreference,
  useThemePreference,
} from "./theme-preference";

describe("theme-preference", () => {
  let setColorScheme: jest.SpyInstance;

  beforeEach(async () => {
    setColorScheme = jest
      .spyOn(Appearance, "setColorScheme")
      .mockImplementation(() => undefined);
    setThemePreference("system");
    setColorScheme.mockClear();
  });

  afterEach(() => setColorScheme.mockRestore());

  it("applies a stored dark choice at startup", () => {
    jest.mocked(SecureStore).setItem("prefs.theme", "dark");

    applyStoredThemePreference();

    expect(setColorScheme).toHaveBeenCalledWith("dark");
  });

  it("tells the hooks in use about the stored choice at startup", async () => {
    const view = await renderHook(() => useThemePreference());
    jest.mocked(SecureStore).setItem("prefs.theme", "light");

    await act(async () => applyStoredThemePreference());

    expect(view.result.current.theme).toBe("light");
  });

  it("follows the phone again for system and for an unknown stored value", () => {
    jest.mocked(SecureStore).setItem("prefs.theme", "sepia");

    applyStoredThemePreference();

    expect(setColorScheme).toHaveBeenCalledWith("unspecified");
  });

  it("stores and applies a choice, and tells every user of the hook", async () => {
    const first = await renderHook(() => useThemePreference());
    const second = await renderHook(() => useThemePreference());
    expect(first.result.current.theme).toBe("system");

    await act(async () => first.result.current.setTheme("dark"));

    expect(setColorScheme).toHaveBeenCalledWith("dark");
    expect(SecureStore.getItem("prefs.theme")).toBe("dark");
    expect(first.result.current.theme).toBe("dark");
    expect(second.result.current.theme).toBe("dark");

    await act(async () => first.result.current.setTheme("system"));

    expect(setColorScheme).toHaveBeenLastCalledWith("unspecified");
    expect(second.result.current.theme).toBe("system");
  });

  it("stops notifying an unmounted hook", async () => {
    const view = await renderHook(() => useThemePreference());
    await view.unmount();

    await act(async () => {
      setThemePreference("light");
    });

    expect(view.result.current.theme).toBe("system");
  });
});
