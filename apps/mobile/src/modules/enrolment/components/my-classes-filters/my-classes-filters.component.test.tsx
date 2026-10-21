import { render, screen, userEvent } from "@testing-library/react-native";

import { MyClassesFilters } from "./my-classes-filters.component";

describe("MyClassesFilters", () => {
  it("draws every chip in order with only the selected one selected, and reports a press", async () => {
    const onSelect = jest.fn();
    await render(<MyClassesFilters selected="pending" onSelect={onSelect} />);

    const chips = screen.getAllByRole("button");
    expect(chips.map((chip) => chip.props.accessibilityLabel)).toEqual([
      "All",
      "Pending",
      "Approved",
      "Denied",
      "Withdrawn",
      "Cancelled",
      "Taken out",
      "Expired",
      "Class cancelled",
    ]);
    expect(screen.getByRole("button", { name: "Pending" })).toBeSelected();
    expect(screen.getByRole("button", { name: "All" })).not.toBeSelected();

    await userEvent.press(screen.getByRole("button", { name: "Expired" }));

    expect(onSelect).toHaveBeenCalledWith("expired");
  });
});
