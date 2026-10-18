import { renderHook } from "@testing-library/react-native";
import { HeaderHeightContext } from "expo-router/react-navigation";
import { PropsWithChildren } from "react";

const { useKeyboardOffset } = jest.requireActual<
  typeof import("./keyboard-offset.hook")
>("./keyboard-offset.hook");

describe("useKeyboardOffset", () => {
  it("returns the height of the header the screen sits below", async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <HeaderHeightContext.Provider value={116}>
        {children}
      </HeaderHeightContext.Provider>
    );

    const { result } = await renderHook(() => useKeyboardOffset(), { wrapper });

    expect(result.current).toBe(116);
  });
});
