import { renderHook } from "@testing-library/react-native";

import { Colors } from "@/constants/theme";

import { useStackHeader } from "./stack-header.hook";

describe("useStackHeader", () => {
  it("returns the fixed native header options from the theme", async () => {
    const { result } = await renderHook(() => useStackHeader());
    const theme = Colors.light;

    expect(result.current).toMatchObject({
      headerShown: true,
      headerShadowVisible: false,
      headerBackButtonDisplayMode: "minimal",
      headerStyle: { backgroundColor: theme.page },
      headerTintColor: theme.ink,
      headerTitleStyle: {
        color: theme.ink,
        fontFamily: "BarlowCondensed_700Bold",
        fontSize: 26,
      },
    });
  });
});
