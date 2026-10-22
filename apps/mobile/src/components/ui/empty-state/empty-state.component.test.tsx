import { render, screen, userEvent } from "@testing-library/react-native";

import { EmptyState } from "./empty-state.component";

describe("EmptyState", () => {
  it("renders the title as a header and the description, without a button", async () => {
    await render(
      <EmptyState
        icon="calendar-outline"
        title="No classes this day"
        description="There are no classes on Saturday, October 17 yet."
      />,
    );

    expect(
      screen.getByRole("header", { name: "No classes this day" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("There are no classes on Saturday, October 17 yet."),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  it("renders the action and calls its onPress", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <EmptyState
        icon="calendar-outline"
        title="Title"
        description="Text"
        action={{ label: "Create class", icon: "add", onPress }}
      />,
    );

    await user.press(screen.getByRole("button", { name: "Create class" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders an action without an icon", async () => {
    await render(
      <EmptyState
        icon="star-outline"
        title="Title"
        description="Text"
        action={{ label: "Clear filters", onPress: () => {} }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Clear filters" }),
    ).toBeOnTheScreen();
  });
});
