import { render, screen, userEvent } from "@testing-library/react-native";
import { isLiquidGlassAvailable } from "expo-glass-effect";

import { HeaderButton } from "./header-button.component";

describe("HeaderButton", () => {
  it("shows no badge by default", async () => {
    await render(<HeaderButton icon="add" label="New class" />);

    expect(screen.getByRole("button", { name: "New class" })).toBeOnTheScreen();
    expect(screen.queryByTestId("header-button-badge")).not.toBeOnTheScreen();
  });

  it("shows the badge count", async () => {
    await render(
      <HeaderButton icon="notifications-outline" label="Bell" badge={3} />,
    );

    expect(screen.getByText("3")).toBeOnTheScreen();
  });

  it("hides the badge at zero", async () => {
    await render(
      <HeaderButton icon="notifications-outline" label="Bell" badge={0} />,
    );

    expect(screen.queryByTestId("header-button-badge")).not.toBeOnTheScreen();
  });

  it("caps the badge at 9+", async () => {
    await render(
      <HeaderButton icon="notifications-outline" label="Bell" badge={12} />,
    );

    expect(screen.getByText("9+")).toBeOnTheScreen();
  });

  it("shows 9 as it is", async () => {
    await render(
      <HeaderButton icon="notifications-outline" label="Bell" badge={9} />,
    );

    expect(screen.getByText("9")).toBeOnTheScreen();
  });

  it("calls onPress when pressed", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<HeaderButton icon="add" label="New class" onPress={onPress} />);

    await user.press(screen.getByRole("button", { name: "New class" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("draws no glass of its own inside a native header", async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);
    await render(<HeaderButton icon="add" label="New class" />);

    expect(screen.queryByTestId("header-button-glass")).not.toBeOnTheScreen();
  });

  it("draws the glass circle when standalone and Liquid Glass is available", async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(true);
    await render(<HeaderButton icon="add" label="New class" standalone />);

    expect(screen.getByTestId("header-button-glass")).toBeOnTheScreen();
  });

  it("is just the icon when standalone without Liquid Glass", async () => {
    jest.mocked(isLiquidGlassAvailable).mockReturnValue(false);
    await render(<HeaderButton icon="add" label="New class" standalone />);

    expect(screen.queryByTestId("header-button-glass")).not.toBeOnTheScreen();
  });

  it.each([
    [undefined, 24],
    [20, 20],
  ])("draws the icon at size %p as %p pt", async (iconSize, size) => {
    await render(<HeaderButton icon="add" label="New class" iconSize={iconSize} />);

    // The glyph is the button's first child, a Text whose font size is the icon's size.
    const [glyph] = screen.getByRole("button", { name: "New class" }).children;

    expect(glyph).toHaveStyle({ fontSize: size });
  });
});
