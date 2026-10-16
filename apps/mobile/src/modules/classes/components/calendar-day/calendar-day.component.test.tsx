import { render, screen, userEvent } from "@testing-library/react-native";

import { CalendarDay } from "./calendar-day.component";

const base = {
  date: "2026-10-15",
  disabled: false,
  adjacentMonth: false,
  today: false,
  edge: false,
  inRange: false,
  bandStart: false,
  bandEnd: false,
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

  it("rounds the band only at its start and its end", async () => {
    const { rerender } = await render(<CalendarDay {...base} inRange bandStart />);
    const className = () => screen.getByTestId("calendar-day-band-2026-10-15").props.className;
    expect(className()).toContain("bg-grape-tint");
    expect(className()).toContain("rounded-l-full");
    expect(className()).not.toContain("rounded-r-full");

    await rerender(<CalendarDay {...base} inRange bandEnd />);
    expect(className()).toContain("rounded-r-full");
    expect(className()).not.toContain("rounded-l-full");

    await rerender(<CalendarDay {...base} inRange />);
    expect(className()).not.toContain("rounded");

    await rerender(<CalendarDay {...base} bandStart bandEnd />);
    expect(className()).not.toContain("bg-grape-tint");
    expect(className()).not.toContain("rounded");
  });

  it("lightens the label of a day of another month, unless it is an end of the range", async () => {
    const { rerender } = await render(<CalendarDay {...base} adjacentMonth />);
    expect(screen.getByText("15").props.className).toContain("text-ink-2 opacity-60");

    await rerender(<CalendarDay {...base} adjacentMonth edge />);
    expect(screen.getByText("15").props.className).toContain("text-on-color");
    expect(screen.getByText("15").props.className).not.toContain("opacity-60");
  });

  it("takes a removed day out of the selection", async () => {
    await render(<CalendarDay {...base} inRange excluded />);

    expect(screen.getByTestId("calendar-day-2026-10-15")).not.toBeSelected();
    expect(screen.getByText("15").props.className).toContain("line-through");
    expect(screen.getByText("15").props.className).toContain("text-ink-3");
  });

  it("strikes through an excluded day and rings today", async () => {
    await render(<CalendarDay {...base} excluded today />);

    expect(screen.getByText("15").props.className).toContain("line-through");
  });
});
