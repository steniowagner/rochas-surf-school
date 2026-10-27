import { renderHook } from "@testing-library/react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Platform } from "react-native";

import { Colors } from "@/constants/theme";

import { useStackHeader } from "./stack-header.hook";

const theme = Colors.light;

const common = {
  headerShown: true,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal",
  headerTitleAlign: "left",
  headerTintColor: theme.ink,
  headerTitleStyle: {
    color: theme.ink,
    fontFamily: "BarlowCondensed_700Bold",
    fontSize: 22,
  },
};

describe("useStackHeader", () => {
  afterEach(() => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);
  });

  it("returns the opaque page-colored header where there is no Liquid Glass", async () => {
    const { result } = await renderHook(() => useStackHeader());

    expect(result.current).toMatchObject({
      ...common,
      headerStyle: { backgroundColor: theme.page },
    });
    expect(result.current).not.toHaveProperty("headerTransparent");
    expect(result.current).not.toHaveProperty("scrollEdgeEffects");
    expect(result.current).not.toHaveProperty("title");
  });

  it("clears the native title on Android, so the title view sits next to the back arrow", async () => {
    Platform.OS = "android";
    try {
      const { result } = await renderHook(() => useStackHeader());

      expect(result.current).toMatchObject({ ...common, title: "" });
    } finally {
      Platform.OS = "ios";
    }
  });

  it("returns the transparent header with a soft top scroll edge on Liquid Glass", async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);

    const { result } = await renderHook(() => useStackHeader());

    expect(result.current).toMatchObject({
      ...common,
      headerTransparent: true,
      headerStyle: { backgroundColor: "transparent" },
      scrollEdgeEffects: { top: "soft" },
    });
  });
});
