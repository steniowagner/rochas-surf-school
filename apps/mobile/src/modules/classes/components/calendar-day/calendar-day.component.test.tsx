import { render, screen, userEvent } from "@testing-library/react-native";

import { CalendarDay } from "./calendar-day.component";

const base = {
  date: "2026-10-15",
  disabled: false,
  today: false,
  edge: false,
  inRange: false,
  excluded: false,
  accessibilityLabel: "15 October 2026",
  onPress: jest.fn(),
};

describe("CalendarDay", () => {
  it("shows the day number and reports a press with its date", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<CalendarDay {...base} onPress={onPress} />);

    await user.press(screen.getByRole("button", { name: "15 October 2026" }));

    expect(screen.getByText("15")).toBeTruthy();
    expect(onPress).toHaveBeenCalledWith("2026-10-15");
  });

  it("ignores presses when disabled", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<CalendarDay {...base} disabled onPress={onPress} />);

    await user.press(screen.getByTestId("calendar-day-2026-10-15"));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId("calendar-day-2026-10-15")).toBeDisabled();
  });

  it("marks the ends and the days between as selected", async () => {
    const { rerender } = await render(<CalendarDay {...base} edge />);
    expect(screen.getByTestId("calendar-day-2026-10-15")).toBeSelected();

    await rerender(<CalendarDay {...base} inRange />);
    expect(screen.getByTestId("calendar-day-2026-10-15")).toBeSelected();

    await rerender(<CalendarDay {...base} />);
    expect(screen.getByTestId("calendar-day-2026-10-15")).not.toBeSelected();
  });

  it("strikes through an excluded day and rings today", async () => {
    await render(<CalendarDay {...base} excluded today />);

    expect(screen.getByText("15").props.className).toContain("line-through");
  });
});
