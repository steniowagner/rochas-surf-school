import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { Button } from "./button.component";
import { disabledGhostClasses, variantClasses } from "./button.constants";
import { ButtonVariant } from "./button.types";

const getSpinners = () =>
  screen.root?.queryAll((node) => node.type === "ActivityIndicator") ?? [];

describe("Button", () => {
  it.each<ButtonVariant>([
    "primary",
    "dark",
    "ink",
    "outline",
    "subtle",
    "danger",
    "success",
    "ghost",
  ])("renders the %s variant and calls onPress", async (variant) => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <Button variant={variant} onPress={onPress}>
        Go
      </Button>,
    );

    await user.press(screen.getByRole("button", { name: "Go" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

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

  it("has no background in the ghost variant, enabled or disabled", async () => {
    expect(variantClasses.ghost.container).not.toMatch(/\bbg-/);
    expect(disabledGhostClasses.container).not.toMatch(/\bbg-/);

    await render(
      <Button variant="ghost" disabled>
        Go
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
  });

  it("shows the spinner in the ghost variant", async () => {
    await render(
      <Button variant="ghost" loading>
        Go
      </Button>,
    );

    expect(getSpinners()).toHaveLength(1);
  });

  it("draws the success variant green, with an on-color label and no shadow", async () => {
    expect(variantClasses.success).toEqual({
      container: "bg-ok",
      label: "text-on-color",
    });

    await render(<Button variant="success">Go</Button>);

    expect(screen.getByRole("button", { name: "Go" })).toHaveStyle({
      shadowOpacity: undefined,
    });
  });

  it("falls back to the disabled classes in the success variant", async () => {
    await render(
      <Button variant="success" disabled>
        Go
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Go" })).toBeDisabled();
  });

  it("draws the icon before the label", async () => {
    await render(<Button icon={<Text>glyph</Text>}>Go</Button>);

    expect(screen.getByText("glyph")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Go" })).toBeOnTheScreen();
  });
});
