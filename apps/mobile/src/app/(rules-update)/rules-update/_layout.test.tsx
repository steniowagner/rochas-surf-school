import { render } from "@testing-library/react-native";
import { Stack } from "expo-router";

import RulesUpdateLayout from "./_layout";

jest.mock("expo-router", () => ({ Stack: jest.fn(() => null) }));

describe("RulesUpdateLayout", () => {
  it("turns swipe-back off and hides the header", async () => {
    await render(<RulesUpdateLayout />);

    expect(Stack).toHaveBeenCalledWith(
      {
        screenOptions: { headerShown: false, gestureEnabled: false },
      },
      undefined,
    );
  });
});
