import { renderHook } from "@testing-library/react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { PropsWithChildren } from "react";

const { useHeaderInset } = jest.requireActual<
  typeof import("./header-inset.hook")
>("./header-inset.hook");

const wrapper = ({ children }: PropsWithChildren) => (
  <HeaderHeightContext.Provider value={116}>
    {children}
  </HeaderHeightContext.Provider>
);

describe("useHeaderInset", () => {
  afterEach(() => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);
  });

  it("returns 0 under the opaque header, where the content already starts below it", async () => {
    const { result } = await renderHook(() => useHeaderInset(), { wrapper });

    expect(result.current).toBe(0);
  });

  it("returns the header's height under the transparent header", async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);

    const { result } = await renderHook(() => useHeaderInset(), { wrapper });

    expect(result.current).toBe(116);
  });
});
