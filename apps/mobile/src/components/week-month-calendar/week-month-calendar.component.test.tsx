import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";

import { WeekMonthCalendar } from "./week-month-calendar.component";
import type { VisibleRange } from "./week-month-calendar.types";

const TODAY = "2026-10-14";

type HarnessProps = {
  initial?: string;
  today?: string;
  markedDates?: string[];
  onVisibleRangeChange?: (range: VisibleRange) => void;
};

function Harness({ initial = TODAY, today = TODAY, markedDates = [], onVisibleRangeChange }: HarnessProps) {
  const [selectedDate, setSelectedDate] = useState(initial);

  return (
    <WeekMonthCalendar
      selectedDate={selectedDate}
      today={today}
      markedDates={markedDates}
      markedLabel="with classes"
      onSelectDate={setSelectedDate}
      onVisibleRangeChange={onVisibleRangeChange}
    />
  );
}

const day = (date: string) => screen.getByTestId(`calendar-day-${date}`);

const press = async (name: string) => {
  const user = userEvent.setup();

  await user.press(screen.getByRole("button", { name }));
};

const pressDay = async (date: string) => {
  const user = userEvent.setup();

  await user.press(day(date));
};

const isWeekRow = () => screen.queryByTestId("calendar-day-2026-10-14-background") !== null;

describe("WeekMonthCalendar", () => {
  it("opens on the week of the selected day", async () => {
    await render(<Harness />);

    expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the month" })).toBeOnTheScreen();
    expect(isWeekRow()).toBe(true);
    expect(day("2026-10-14")).toBeSelected();
    expect(screen.queryByTestId("calendar-day-2026-11-01")).not.toBeOnTheScreen();
  });

  it("switches between week and month", async () => {
    await render(<Harness />);

    await press("Show the month");

    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the week" })).toBeExpanded();
    expect(isWeekRow()).toBe(false);
    expect(screen.getByTestId("calendar-day-2026-11-01")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the previous month" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the next month" })).toBeOnTheScreen();

    await press("Show the week");

    expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the month" })).not.toBeExpanded();
    expect(isWeekRow()).toBe(true);
    expect(screen.getByRole("button", { name: "Show the previous week" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the next week" })).toBeOnTheScreen();
  });

  it("selecting a day keeps the view", async () => {
    await render(<Harness />);

    await pressDay("2026-10-16");

    expect(day("2026-10-16")).toBeSelected();
    expect(isWeekRow()).toBe(true);
    expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();

    await press("Show the month");
    await pressDay("2026-10-20");

    expect(day("2026-10-20")).toBeSelected();
    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
    expect(isWeekRow()).toBe(false);

    await pressDay("2026-10-20");

    expect(day("2026-10-20")).toBeSelected();
    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
  });

  it("selection carries across views", async () => {
    await render(<Harness initial="2026-10-23" />);

    await press("Show the month");
    await press("Show the week");

    expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();
    expect(day("2026-10-23")).toBeSelected();

    await press("Show the next week");
    await press("Show the month");

    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
    expect(day("2026-10-30")).toBeSelected();
  });

  it("carries the selection from a week that ends the month into the next month", async () => {
    await render(<Harness initial="2026-11-01" />);

    expect(screen.getByText("26 OCT – 1 NOV")).toBeOnTheScreen();

    await press("Show the month");

    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(day("2026-11-01")).toBeSelected();
  });

  it("adjacent month day moves the grid", async () => {
    await render(<Harness />);

    await press("Show the month");
    await pressDay("2026-11-01");

    expect(day("2026-11-01")).toBeSelected();
    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the week" })).toBeExpanded();
  });

  it("adjacent month day before the first moves the grid back", async () => {
    await render(<Harness />);

    await press("Show the month");
    await pressDay("2026-09-28");

    expect(day("2026-09-28")).toBeSelected();
    expect(screen.getByText("SEPTEMBER 2026")).toBeOnTheScreen();
  });

  it("moves with the arrows by the view", async () => {
    await render(<Harness />);

    await press("Show the next week");

    expect(day("2026-10-21")).toBeSelected();
    expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();

    await press("Show the previous week");
    await press("Show the previous week");

    expect(day("2026-10-07")).toBeSelected();
    expect(screen.getByText("5 – 11 OCT")).toBeOnTheScreen();
  });

  it("moves the month with the arrows and keeps the day number", async () => {
    await render(<Harness />);

    await press("Show the month");
    await press("Show the next month");

    expect(day("2026-11-14")).toBeSelected();
    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();

    await press("Show the previous month");
    await press("Show the previous month");

    expect(day("2026-09-14")).toBeSelected();
    expect(screen.getByText("SEPTEMBER 2026")).toBeOnTheScreen();
  });

  it("caps the day at the last day of the month with the arrows", async () => {
    await render(<Harness initial="2027-01-31" />);

    await press("Show the month");
    await press("Show the next month");

    expect(day("2027-02-28")).toBeSelected();
  });

  it("shows Today only when today isn't in the shown week, and goes back to it keeping the view", async () => {
    await render(<Harness />);

    expect(screen.queryByRole("button", { name: "Today" })).not.toBeOnTheScreen();

    await press("Show the next week");

    expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();

    await press("Today");

    expect(day("2026-10-14")).toBeSelected();
    expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
    expect(isWeekRow()).toBe(true);
    expect(screen.queryByRole("button", { name: "Today" })).not.toBeOnTheScreen();
  });

  it("shows Today only when today isn't in the shown month, and goes back to it keeping the view", async () => {
    await render(<Harness initial="2026-10-20" />);
    await press("Show the month");

    expect(screen.queryByRole("button", { name: "Today" })).not.toBeOnTheScreen();

    await press("Show the next month");

    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();

    await press("Today");

    expect(day("2026-10-14")).toBeSelected();
    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
    expect(isWeekRow()).toBe(false);
  });

  it("doesn't count a day of an adjacent month drawn in the grid as today", async () => {
    await render(<Harness initial="2026-11-15" today="2026-10-31" />);
    await press("Show the month");

    // 2026-10-31 is drawn in the first week of the November grid, but the shown month is November.
    expect(screen.getByTestId("calendar-day-2026-10-31")).toBeOnTheScreen();
    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Today" })).toBeOnTheScreen();
  });

  it("shows a dot only on the days with classes, in both views", async () => {
    await render(<Harness markedDates={["2026-10-14", "2026-11-01"]} />);

    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(1);
    expect(screen.getByLabelText("Wednesday, October 14th, 2026, with classes")).toBeOnTheScreen();

    await press("Show the month");

    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(2);
  });

  it("reports the visible range on mount and whenever it changes", async () => {
    const onVisibleRangeChange = jest.fn();
    await render(<Harness onVisibleRangeChange={onVisibleRangeChange} />);

    expect(onVisibleRangeChange).toHaveBeenLastCalledWith({ from: "2026-10-12", to: "2026-10-18" });
    expect(onVisibleRangeChange).toHaveBeenCalledTimes(1);

    await pressDay("2026-10-16");

    expect(onVisibleRangeChange).toHaveBeenCalledTimes(1);

    await press("Show the month");

    expect(onVisibleRangeChange).toHaveBeenLastCalledWith({ from: "2026-09-28", to: "2026-11-01" });

    await press("Show the next month");

    expect(onVisibleRangeChange).toHaveBeenLastCalledWith({ from: "2026-10-26", to: "2026-12-06" });
    expect(onVisibleRangeChange).toHaveBeenCalledTimes(3);
  });

  it("works without a visible range listener", async () => {
    await render(<Harness />);

    await press("Show the month");

    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
  });
});
