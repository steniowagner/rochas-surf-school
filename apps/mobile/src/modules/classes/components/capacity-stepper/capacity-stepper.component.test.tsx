import { render, screen, userEvent } from "@testing-library/react-native";

import { CapacityStepper } from "./capacity-stepper.component";

describe("CapacityStepper", () => {
  it("shows the value and the unit", async () => {
    await render(<CapacityStepper value={8} min={1} max={20} onChange={jest.fn()} />);

    expect(screen.getByText("8")).toBeTruthy();
    expect(screen.getByText("students per class")).toBeTruthy();
  });

  it("steps down and up by one", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<CapacityStepper value={8} min={1} max={20} onChange={onChange} />);

    await user.press(screen.getByRole("button", { name: "Decrease" }));
    await user.press(screen.getByRole("button", { name: "Increase" }));

    expect(onChange).toHaveBeenNthCalledWith(1, 7);
    expect(onChange).toHaveBeenNthCalledWith(2, 9);
  });

  it("turns the decrease button off at the minimum", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<CapacityStepper value={1} min={1} max={20} onChange={onChange} />);

    await user.press(screen.getByRole("button", { name: "Decrease" }));

    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase" })).toBeEnabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("turns the increase button off at the maximum", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<CapacityStepper value={20} min={1} max={20} onChange={onChange} />);

    await user.press(screen.getByRole("button", { name: "Increase" }));

    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease" })).toBeEnabled();
    expect(onChange).not.toHaveBeenCalled();
  });
});
