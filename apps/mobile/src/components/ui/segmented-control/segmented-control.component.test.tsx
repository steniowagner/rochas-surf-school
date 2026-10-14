import { render, screen, userEvent } from "@testing-library/react-native";

import { SegmentedControl } from "./segmented-control.component";

const options = [
  { value: "a", label: "A" },
  { value: "b", label: "B" },
];

describe("SegmentedControl", () => {
  it("renders one tab per option with the value selected", async () => {
    await render(<SegmentedControl options={options} value="a" onChange={jest.fn()} />);

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "A", selected: true })).toBeOnTheScreen();
    expect(screen.getByRole("tab", { name: "B", selected: false })).toBeOnTheScreen();
  });

  it("calls onChange once with the pressed value", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<SegmentedControl options={options} value="a" onChange={onChange} />);

    await user.press(screen.getByRole("tab", { name: "B" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("does not call onChange when the selected segment is pressed", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<SegmentedControl options={options} value="a" onChange={onChange} />);

    await user.press(screen.getByRole("tab", { name: "A" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("works with any string value type", async () => {
    type Mode = "day" | "week" | "month";
    const modes: { value: Mode; label: string }[] = [
      { value: "day", label: "Day" },
      { value: "week", label: "Week" },
      { value: "month", label: "Month" },
    ];
    const onChange = jest.fn<void, [Mode]>();
    const user = userEvent.setup();
    await render(<SegmentedControl options={modes} value="week" onChange={onChange} />);

    await user.press(screen.getByRole("tab", { name: "Month" }));

    expect(onChange).toHaveBeenCalledWith("month");
  });
});
