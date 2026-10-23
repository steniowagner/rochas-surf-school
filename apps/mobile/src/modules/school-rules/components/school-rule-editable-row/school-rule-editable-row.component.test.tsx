import { render, screen, userEvent } from "@testing-library/react-native";

import { SchoolRuleEditableRow } from "./school-rule-editable-row.component";
import { SchoolRuleEditableRowProps } from "./school-rule-editable-row.types";

jest.useFakeTimers();

const RULE = {
  id: "r-2",
  title: "Bring sunscreen",
  description: "Put it on before every class.",
  index: 2,
};

async function renderRow(overrides: Partial<SchoolRuleEditableRowProps> = {}) {
  const props: SchoolRuleEditableRowProps = {
    rule: RULE,
    position: 2,
    showDivider: true,
    moveUpDisabled: false,
    moveDownDisabled: false,
    onEdit: jest.fn(),
    onMoveUp: jest.fn(),
    onMoveDown: jest.fn(),
    ...overrides,
  };
  await render(<SchoolRuleEditableRow {...props} />);

  return { props, user: userEvent.setup() };
}

describe("SchoolRuleEditableRow", () => {
  it("shows the position, the title and the explanation as written, with both arrows", async () => {
    await renderRow();

    expect(screen.getByText("02")).toBeOnTheScreen();
    expect(screen.getByText(RULE.title)).toBeOnTheScreen();
    expect(screen.getByText(RULE.description)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Move rule 2 up" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Move rule 2 down" })).toBeEnabled();
  });

  it("pads the position to two digits only below 10", async () => {
    await renderRow({ position: 12 });

    expect(screen.getByText("12")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Move rule 12 up" })).toBeOnTheScreen();
  });

  it("opens the rule when its text is tapped", async () => {
    const { props, user } = await renderRow();

    await user.press(screen.getByText(RULE.description));

    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(props.onMoveUp).not.toHaveBeenCalled();
  });

  it("moves the rule up and down with the arrows", async () => {
    const { props, user } = await renderRow();

    await user.press(screen.getByRole("button", { name: "Move rule 2 up" }));
    await user.press(screen.getByRole("button", { name: "Move rule 2 down" }));

    expect(props.onMoveUp).toHaveBeenCalledTimes(1);
    expect(props.onMoveDown).toHaveBeenCalledTimes(1);
    expect(props.onEdit).not.toHaveBeenCalled();
  });

  it("ignores a disabled arrow", async () => {
    const { props, user } = await renderRow({ moveUpDisabled: true, moveDownDisabled: true });
    const up = screen.getByRole("button", { name: "Move rule 2 up" });
    const down = screen.getByRole("button", { name: "Move rule 2 down" });

    expect(up).toBeDisabled();
    expect(down).toBeDisabled();

    await user.press(up);
    await user.press(down);

    expect(props.onMoveUp).not.toHaveBeenCalled();
    expect(props.onMoveDown).not.toHaveBeenCalled();
  });

  it("draws the divider under a row that isn't the last", async () => {
    await renderRow({ showDivider: true });

    expect(screen.root?.props.className).toContain("border-b border-line");
  });

  it("draws no divider under the last row", async () => {
    await renderRow({ showDivider: false });

    expect(screen.root?.props.className).not.toContain("border-b");
  });
});
