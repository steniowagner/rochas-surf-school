import { render, screen, userEvent } from "@testing-library/react-native";

import { Checkbox } from "./checkbox.component";

const LABEL = "I accept";

describe("Checkbox", () => {
  it("renders the label with the checkbox role, unchecked", async () => {
    await render(
      <Checkbox checked={false} onChange={jest.fn()} label={LABEL} />,
    );

    const checkbox = screen.getByRole("checkbox", { name: LABEL });

    expect(checkbox).toBeOnTheScreen();
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByTestId("checkmark")).not.toBeOnTheScreen();
  });

  it("calls onChange(true) when the label is pressed", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Checkbox checked={false} onChange={onChange} label={LABEL} />,
    );

    await user.press(screen.getByText(LABEL));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("shows the check mark when checked and calls onChange(false)", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<Checkbox checked onChange={onChange} label={LABEL} />);

    expect(screen.getByRole("checkbox", { name: LABEL })).toBeChecked();
    expect(screen.getByTestId("checkmark")).toBeOnTheScreen();

    await user.press(screen.getByRole("checkbox", { name: LABEL }));

    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("stacks the helper under the label and toggles from it", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Checkbox
        checked={false}
        onChange={onChange}
        label={LABEL}
        helper="The fine print"
      />,
    );

    expect(screen.getByRole("checkbox", { name: LABEL })).toHaveProp(
      "accessibilityHint",
      "The fine print",
    );
    expect(screen.getByText("The fine print")).toHaveProp(
      "className",
      expect.stringContaining("text-ink-2"),
    );

    await user.press(screen.getByText("The fine print"));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("draws the ink box with page-colored text in the ink variant", async () => {
    await render(
      <Checkbox
        checked={false}
        onChange={jest.fn()}
        label={LABEL}
        helper="The fine print"
        variant="ink"
      />,
    );

    expect(screen.getByRole("checkbox", { name: LABEL })).toHaveProp(
      "className",
      expect.stringContaining("rounded-control bg-ink"),
    );
    expect(screen.getByText(LABEL)).toHaveProp(
      "className",
      expect.stringContaining("text-page"),
    );
    expect(screen.getByText("The fine print")).toHaveProp(
      "className",
      expect.stringContaining("text-ink-3"),
    );
  });

  it("ignores presses when disabled", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Checkbox checked={false} onChange={onChange} label={LABEL} disabled />,
    );

    await user.press(screen.getByText(LABEL));

    expect(screen.getByRole("checkbox", { name: LABEL })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
