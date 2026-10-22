import { render, screen, userEvent } from "@testing-library/react-native";

import { glyph } from "../../classes.test-utils";

import { ClassRuleRow } from "./class-rule-row.component";

describe("ClassRuleRow", () => {
  it("shows the icon, the title, the value and a chevron, and is one button", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(
      <ClassRuleRow icon="shield-outline" title="School rules" value="3 rules for every student" onPress={onPress} />,
    );

    expect(screen.getByText(glyph("shield-outline"))).toBeOnTheScreen();
    expect(screen.getByText("School rules")).toBeOnTheScreen();
    expect(screen.getByText("3 rules for every student")).toBeOnTheScreen();
    expect(screen.getByText(glyph("chevron-forward"))).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "School rules" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("shows the title alone without a value", async () => {
    await render(<ClassRuleRow icon="shield-outline" title="School rules" value={null} onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "School rules" })).toBeOnTheScreen();
    expect(screen.queryByText(/rules for every student/)).toBeNull();
  });
});
