import { render, screen, userEvent } from "@testing-library/react-native";

import { Button, ButtonVariant } from "./button";

const getSpinners = () =>
  screen.root?.queryAll((node) => node.type === "ActivityIndicator") ?? [];

describe("Button", () => {
  it.each<ButtonVariant>(["primary", "dark", "outline", "subtle", "danger"])(
    "renders the %s variant and calls onPress",
    async (variant) => {
      const onPress = jest.fn();
      const user = userEvent.setup();
      await render(
        <Button variant={variant} onPress={onPress}>
          Go
        </Button>,
      );

      await user.press(screen.getByRole("button", { name: "Go" }));

      expect(onPress).toHaveBeenCalledTimes(1);
    },
  );

  it("is disabled, without press, when disabled", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <Button disabled onPress={onPress}>
        Go
      </Button>,
    );

    await user.press(screen.getByRole("button", { name: "Go" }));

    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows the spinner instead of the label and ignores presses while loading", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <Button loading onPress={onPress}>
        Go
      </Button>,
    );

    await user.press(screen.getByRole("button", { name: "Go" }));

    expect(getSpinners()).toHaveLength(1);
    expect(screen.queryByText("Go")).toBeNull();
    expect(onPress).not.toHaveBeenCalled();
  });
});
