import { renderHook } from "@testing-library/react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { PropsWithChildren } from "react";

const { useKeyboardOffset } = jest.requireActual<
  typeof import("./keyboard-offset.hook")
>("./keyboard-offset.hook");

const wrapper = ({ children }: PropsWithChildren) => (
  <HeaderHeightContext.Provider value={116}>
    {children}
  </HeaderHeightContext.Provider>
);

describe("useKeyboardOffset", () => {
  afterEach(() => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);
  });

  it("returns the height of the opaque header the screen sits below", async () => {
    const { result } = await renderHook(() => useKeyboardOffset(), { wrapper });

    expect(result.current).toBe(116);
  });

  it("returns 0 under the transparent header, where the view starts at the top of the window", async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);

    const { result } = await renderHook(() => useKeyboardOffset(), { wrapper });

    expect(result.current).toBe(0);
  });
});
