import {
  act,
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";

import type { DisciplineFilterValue } from "../../classes.types";

import { DisciplineFilter } from "./discipline-filter.component";
import {
  BACKDROP_ENTERING,
  DISCIPLINE_FILTER_OPTIONS,
  OPTION_ENTERING,
} from "./discipline-filter.constants";

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

  it("fades the backdrop in and raises the options one after another", async () => {
    const { user, view } = renderFilter();
    await view;

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));

    expect(
      screen.getByTestId("discipline-filter-backdrop-fade").props.entering,
    ).toBe(BACKDROP_ENTERING);
    DISCIPLINE_FILTER_OPTIONS.forEach((option, index) => {
      expect(
        screen.getByTestId(`discipline-filter-option-${option}`).props.entering,
      ).toBe(OPTION_ENTERING[index]);
    });
  });

  it("turns the button to −90° while open and back when closed", async () => {
    const { user, view } = renderFilter();
    await view;
    // The closed button is hidden from accessibility while open, under the open one; both share the turn.
    const turn = () =>
      screen.getByTestId("discipline-filter-button-turn", {
        includeHiddenElements: true,
      });

    expect(turn()).toHaveStyle({ transform: [{ rotate: "0deg" }] });

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));

    expect(turn()).toHaveStyle({ transform: [{ rotate: "-90deg" }] });
    expect(
      screen.getByTestId("discipline-filter-open-button-turn"),
    ).toHaveStyle({ transform: [{ rotate: "-90deg" }] });

    await user.press(screen.getByRole("button", { name: "Close filter" }));

    expect(turn()).toHaveStyle({ transform: [{ rotate: "0deg" }] });
  });

  it("renders the open filter above the header and the tab bar", async () => {
    const { user, view } = renderFilter();
    await view;
    expect(
      screen.queryByTestId("discipline-filter-overlay"),
    ).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));

    // A transparent modal over the whole window, so the scrim also covers the native header and tab bar.
    const overlay = screen.getByTestId("discipline-filter-overlay");
    expect(overlay).toHaveProp("transparent", true);
    expect(overlay).toHaveProp("statusBarTranslucent", true);
    expect(overlay).toHaveProp("navigationBarTranslucent", true);
    expect(
      within(overlay).getByTestId("discipline-filter-backdrop"),
    ).toBeOnTheScreen();
    for (const label of OPTION_LABELS) {
      expect(
        within(overlay).getByRole("button", { name: label }),
      ).toBeOnTheScreen();
    }
    expect(
      within(overlay).getByRole("button", { name: "Close filter" }),
    ).toBeOnTheScreen();
    // Laid out at the provider's frame (the mock's 320×640 at 0,0), where the closed button is.
    expect(screen.getByTestId("discipline-filter-layer")).toHaveStyle({
      left: 0,
      top: 0,
      width: 320,
      height: 640,
    });
  });

  it("closes on the Android back button", async () => {
    const { onChange, user, view } = renderFilter("surf");
    await view;

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));
    await act(async () => {
      screen.getByTestId("discipline-filter-overlay").props.onRequestClose();
    });

    expect(
      screen.queryByTestId("discipline-filter-overlay"),
    ).not.toBeOnTheScreen();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("hides the closed button while open", async () => {
    const { user, view } = renderFilter();
    await view;

    await user.press(screen.getByRole("button", { name: "Filter by sport" }));

    expect(
      screen.queryByRole("button", { name: "Filter by sport" }),
    ).not.toBeOnTheScreen();
    expect(screen.getAllByRole("button", { name: /filter/i })).toHaveLength(1);

    await user.press(screen.getByRole("button", { name: "Close filter" }));

    expect(
      screen.getByRole("button", { name: "Filter by sport" }),
    ).toBeOnTheScreen();
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
