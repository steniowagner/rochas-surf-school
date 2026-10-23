import { render, screen, userEvent } from "@testing-library/react-native";

import { MyClassesFilters } from "./my-classes-filters.component";

describe("MyClassesFilters", () => {
  it("draws the four chips in order with only the selected one selected, and reports a press", async () => {
    const onSelect = jest.fn();
    await render(<MyClassesFilters selected="pending" onSelect={onSelect} />);

    const chips = screen.getAllByRole("button");
    expect(chips.map((chip) => chip.props.accessibilityLabel)).toEqual(["All", "Pending", "Confirmed", "Ended"]);
    expect(screen.getByRole("button", { name: "Pending" })).toBeSelected();
    expect(screen.getByRole("button", { name: "All" })).not.toBeSelected();

    await userEvent.press(screen.getByRole("button", { name: "Ended" }));

    expect(onSelect).toHaveBeenCalledWith("ended");
  });
});
