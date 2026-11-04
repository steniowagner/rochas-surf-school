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

    await userEvent
      .setup()
      .press(screen.getByRole("button", { name: "Manage" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps the hint and the action together at the right end of the label's row", async () => {
    await render(
      <FormSection
        label="Location"
        hint="required"
        action={{ label: "Manage", onPress: jest.fn() }}
      >
        <Text>content</Text>
      </FormSection>,
    );

    const hint = screen.getByText("required");
    const action = screen.getByRole("button", { name: "Manage" });
    // Siblings in one group, so the row spreads the label and that group, not the hint on its own.
    expect(action.parent).toBe(hint.parent);
    expect(screen.getByRole("header", { name: "Location" }).parent).not.toBe(
      hint.parent,
    );
  });
});
