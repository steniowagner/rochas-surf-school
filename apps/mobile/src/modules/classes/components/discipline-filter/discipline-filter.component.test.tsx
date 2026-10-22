import {
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";

import type { DisciplineFilterValue } from "../../classes.types";

import { DisciplineFilter } from "./discipline-filter.component";

const renderFilter = (value: DisciplineFilterValue = "all") => {
  const onChange = jest.fn();
  const user = userEvent.setup();

  return {
    onChange,
    user,
    view: render(<DisciplineFilter value={value} onChange={onChange} />),
  };
};

const OPTION_LABELS = ["All", "Surf", "Skate"];

describe("DisciplineFilter", () => {
  it("renders only the closed button", async () => {
    const { view } = renderFilter();
    await view;

    expect(
      screen.getByRole("button", { name: "Filter by sport" }),
    ).toBeOnTheScreen();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(
      screen.queryByTestId("discipline-filter-backdrop"),
    ).not.toBeOnTheScreen();
  });

  it("opens the three options", async () => {
    const { user, view } = renderFilter("surf");
    await view;

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));

    expect(screen.getByTestId("discipline-filter-backdrop")).toBeOnTheScreen();
    const close = screen.getByRole("button", { name: "Close filter" });
    expect(within(close).getAllByText(/.+/)).toHaveLength(1);
    for (const label of OPTION_LABELS) {
      const option = screen.getByRole("button", { name: label });
      // Each option is only its label: an icon would be a second text (its glyph), as in the button.
      expect(within(option).getAllByText(/.+/)).toHaveLength(1);
      expect(option).toHaveTextContent(label, { exact: true });
    }
    expect(
      screen.getByRole("button", { name: "Surf", selected: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "All", selected: false }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Skate", selected: false }),
    ).toBeOnTheScreen();
  });

  it("selects All the first time", async () => {
    const { user, view } = renderFilter();
    await view;

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));

    expect(
      screen.getByRole("button", { name: "All", selected: true }),
    ).toBeOnTheScreen();
  });

  it("closes without changing the filter", async () => {
    const { onChange, user, view } = renderFilter();
    await view;

    // With the button.
    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    await user.press(screen.getByRole("button", { name: "Close filter" }));

    expect(
      screen.queryByRole("button", { name: "Surf" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId("discipline-filter-backdrop"),
    ).not.toBeOnTheScreen();

    // With the backdrop.
    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    await user.press(screen.getByTestId("discipline-filter-backdrop"));

    expect(
      screen.queryByRole("button", { name: "Surf" }),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Filter by sport" }),
    ).toBeOnTheScreen();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each<[string, DisciplineFilterValue]>([
    ["All", "all"],
    ["Surf", "surf"],
    ["Skate", "skate"],
  ])("calls onChange and closes when %s is chosen", async (label, value) => {
    const { onChange, user, view } = renderFilter(
      value === "all" ? "skate" : "all",
    );
    await view;

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    await user.press(screen.getByRole("button", { name: label }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(value);
    expect(screen.queryByRole("button", { name: label })).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId("discipline-filter-backdrop"),
    ).not.toBeOnTheScreen();
  });
});
