import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";

import { WeekMonthCalendar } from "./week-month-calendar.component";
import type { CalendarPeriod, VisibleRange } from "./week-month-calendar.types";

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

  it("has no shortcut back to today, away from today's week or month", async () => {
    await render(<Harness />);

    await press("Show the next week");

    expect(screen.queryByText("Today")).not.toBeOnTheScreen();

    await press("Show the month");
    await press("Show the next month");

    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(screen.queryByText("Today")).not.toBeOnTheScreen();
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

type ClearableHarnessProps = {
  initial?: string | null;
  today?: string;
  markedDates?: string[];
  onPeriodChange?: (period: CalendarPeriod) => void;
  onSelectDate?: (date: string) => void;
};

function ClearableHarness({
  initial = null,
  today = TODAY,
  markedDates = [],
  onPeriodChange,
  onSelectDate,
}: ClearableHarnessProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(initial);

  return (
    <WeekMonthCalendar
      selectedDate={selectedDate}
      today={today}
      markedDates={markedDates}
      onSelectDate={(date) => {
        onSelectDate?.(date);
        setSelectedDate(date);
      }}
      initialView="month"
      clearable
      onClearSelection={() => setSelectedDate(null)}
      onPeriodChange={onPeriodChange}
    />
  );
}

const selectedDays = () =>
  screen.queryAllByTestId(/^calendar-day-\d{4}-\d{2}-\d{2}$/).filter((node) => node.props.accessibilityState?.selected);

describe("WeekMonthCalendar, clearable", () => {
  it("opens on today's month with no day selected", async () => {
    await render(<ClearableHarness />);

    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Show the week" })).toBeExpanded();
    expect(selectedDays()).toHaveLength(0);
  });

  it("reports the period on screen, never the faded days of the grid", async () => {
    const onPeriodChange = jest.fn();
    await render(<ClearableHarness onPeriodChange={onPeriodChange} />);

    expect(onPeriodChange).toHaveBeenLastCalledWith({ from: "2026-10-01", to: "2026-10-31" });

    await press("Show the previous month");

    expect(onPeriodChange).toHaveBeenLastCalledWith({ from: "2026-09-01", to: "2026-09-30" });

    await press("Show the week");

    expect(onPeriodChange).toHaveBeenLastCalledWith({ from: "2026-08-31", to: "2026-09-06" });
    expect(onPeriodChange).toHaveBeenCalledTimes(3);
  });

  it("moves the month with the arrows without selecting a day", async () => {
    const onSelectDate = jest.fn();
    await render(<ClearableHarness onSelectDate={onSelectDate} />);

    await press("Show the next month");

    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(selectedDays()).toHaveLength(0);
    expect(onSelectDate).not.toHaveBeenCalled();
  });

  it("selects a day, and clears it when pressed again", async () => {
    await render(<ClearableHarness />);

    await pressDay("2026-10-20");

    expect(day("2026-10-20")).toBeSelected();

    await pressDay("2026-10-20");

    expect(day("2026-10-20")).not.toBeSelected();
    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
  });

  it("opens the month of a faded day with that day selected", async () => {
    const onPeriodChange = jest.fn();
    await render(<ClearableHarness onPeriodChange={onPeriodChange} />);

    await pressDay("2026-11-01");

    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(day("2026-11-01")).toBeSelected();
    expect(onPeriodChange).toHaveBeenLastCalledWith({ from: "2026-11-01", to: "2026-11-30" });
  });

  it("clears the selection when an arrow moves the period, in both views", async () => {
    await render(<ClearableHarness />);

    await pressDay("2026-10-20");
    await press("Show the next month");

    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(selectedDays()).toHaveLength(0);

    await press("Show the week");
    await pressDay("2026-11-01");
    await press("Show the previous week");

    expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();
    expect(selectedDays()).toHaveLength(0);
  });

  it("moves the week with the arrows by seven days", async () => {
    await render(<ClearableHarness />);

    await press("Show the week");
    await press("Show the next week");

    expect(screen.getByText("19 – 25 OCT")).toBeOnTheScreen();
  });

  it("keeps the selected day when switching view, opening its week and its month", async () => {
    await render(<ClearableHarness />);

    await pressDay("2026-10-27");
    await press("Show the week");

    expect(screen.getByText("26 OCT – 1 NOV")).toBeOnTheScreen();
    expect(day("2026-10-27")).toBeSelected();

    await pressDay("2026-11-01");
    await press("Show the month");

    expect(screen.getByText("NOVEMBER 2026")).toBeOnTheScreen();
    expect(day("2026-11-01")).toBeSelected();
  });

  it("opens today's week from today's month without a selected day", async () => {
    await render(<ClearableHarness />);

    await press("Show the week");

    expect(screen.getByText("12 – 18 OCT")).toBeOnTheScreen();
  });

  it("opens the week of the 1st from another month without a selected day", async () => {
    await render(<ClearableHarness />);

    await press("Show the next month");
    await press("Show the week");

    expect(screen.getByText("26 OCT – 1 NOV")).toBeOnTheScreen();
  });

  it("opens the month of the week's Monday without a selected day", async () => {
    await render(<ClearableHarness />);

    await press("Show the next month");
    await press("Show the week");
    await press("Show the month");

    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
  });

  it("opens on the selected day's month when one is given", async () => {
    await render(<ClearableHarness initial="2026-08-14" />);

    expect(screen.getByText("AUGUST 2026")).toBeOnTheScreen();
    expect(day("2026-08-14")).toBeSelected();
  });

  it("shows one dot on each marked day of the month", async () => {
    await render(<ClearableHarness markedDates={["2026-10-05", "2026-10-06"]} />);

    expect(screen.queryAllByTestId("calendar-day-2026-10-05-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId("calendar-day-2026-10-06-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(2);
  });

  it("works without the clearing and period listeners", async () => {
    await render(
      <WeekMonthCalendar selectedDate="2026-10-14" today={TODAY} markedDates={[]} onSelectDate={jest.fn()} clearable />,
    );

    await pressDay("2026-10-14");
    await press("Show the previous week");

    expect(screen.getByText("5 – 11 OCT")).toBeOnTheScreen();
  });
});
