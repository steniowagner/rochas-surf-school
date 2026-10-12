import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthButton } from "./auth-button.component";

const getSpinners = () =>
  screen.root?.queryAll((node) => node.type === "ActivityIndicator") ?? [];

describe("AuthButton", () => {
  it("shows the icon and the label, and calls onPress", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <AuthButton
        variant="light"
        label="Continue"
        icon={<Text>icon</Text>}
        onPress={onPress}
      />,
    );

    await user.press(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByText("icon")).toBeOnTheScreen();
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each(["light", "primary"] as const)(
    "loading: a %s button shows a spinner instead of the icon and label, and ignores presses",
    async (variant) => {
      const user = userEvent.setup();
      const onPress = jest.fn();
      await render(
        <AuthButton
          variant={variant}
          label="Continue"
          icon={<Text>icon</Text>}
          loading
          onPress={onPress}
        />,
      );

      await user.press(screen.getByRole("button", { name: "Continue" }));

      expect(getSpinners()).toHaveLength(1);
      expect(screen.queryByText("icon")).toBeNull();
      expect(screen.queryByText("Continue")).toBeNull();
      expect(onPress).not.toHaveBeenCalled();
    },
  );
});
