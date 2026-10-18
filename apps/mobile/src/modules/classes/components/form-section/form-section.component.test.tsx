import { render, screen, userEvent } from "@testing-library/react-native";
import { Text } from "react-native";

import { FormSection } from "./form-section.component";

describe("FormSection", () => {
  it("shows the label, the hint and its content", async () => {
    await render(
      <FormSection label="Location" hint="pick a location">
        <Text>content</Text>
      </FormSection>,
    );

    expect(screen.getByRole("header", { name: "Location" })).toBeTruthy();
    expect(screen.getByText("pick a location")).toBeTruthy();
    expect(screen.getByText("content")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers its action as a button on the label's row", async () => {
    const onPress = jest.fn();
    await render(
      <FormSection label="Location" action={{ label: "Manage", onPress }}>
        <Text>content</Text>
      </FormSection>,
    );

    await userEvent.setup().press(screen.getByRole("button", { name: "Manage" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
