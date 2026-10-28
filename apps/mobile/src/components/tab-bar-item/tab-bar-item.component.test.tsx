import { render, screen, userEvent } from "@testing-library/react-native";

import { TabBarItem } from "./tab-bar-item.component";

describe("TabBarItem", () => {
  it("is a tab named after its label, selected or not", async () => {
    const { rerender } = await render(
      <TabBarItem
        label="Classes"
        icon={{ set: "Ionicons", name: "calendar-outline" }}
        selected={false}
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Classes", selected: false }),
    ).toBeOnTheScreen();

    await rerender(
      <TabBarItem
        label="Classes"
        icon={{ set: "Ionicons", name: "calendar-outline" }}
        selected
        onPress={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Classes", selected: true }),
    ).toBeOnTheScreen();
  });

  it("draws a Feather glyph too", async () => {
    await render(
      <TabBarItem
        label="School"
        icon={{ set: "Feather", name: "users" }}
        selected
        onPress={jest.fn()}
      />,
    );

    expect(screen.getByRole("tab", { name: "School" })).toBeOnTheScreen();
  });

  it("calls onPress when pressed", async () => {
    const onPress = jest.fn();
    await render(
      <TabBarItem
        label="People"
        icon={{ set: "Ionicons", name: "people-outline" }}
        selected={false}
        onPress={onPress}
      />,
    );

    await userEvent.press(screen.getByRole("tab", { name: "People" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
