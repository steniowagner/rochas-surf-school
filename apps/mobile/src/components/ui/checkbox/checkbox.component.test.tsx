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
