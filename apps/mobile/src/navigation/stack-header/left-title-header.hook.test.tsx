import { renderHook } from "@testing-library/react-native";
import { router } from "expo-router";
import { Text } from "react-native";

import { useLeftTitleHeader } from "./left-title-header.hook";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

const renderTitle = () => <Text>Title</Text>;

describe("useLeftTitleHeader", () => {
  it("puts the title in a left item, after a back button when the screen can go back", async () => {
    const { result } = await renderHook(() => useLeftTitleHeader(renderTitle));

    const items = result.current.unstable_headerLeftItems?.({
      canGoBack: true,
    });

    expect(items?.map((item) => item.type)).toEqual(["button", "custom"]);
    if (items?.[0].type === "button") {
      items[0].onPress();
    }
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("has no back button on a screen that can't go back", async () => {
    const { result } = await renderHook(() => useLeftTitleHeader(renderTitle));

    const items = result.current.unstable_headerLeftItems?.({
      canGoBack: false,
    });

    expect(items?.map((item) => item.type)).toEqual(["custom"]);
  });
});
