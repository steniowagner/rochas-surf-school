import { render, screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";

import i18n from "@/i18n";

import { DateRange } from "../../utils/calendar";

import { DateRangeCalendar } from "./date-range-calendar.component";

const TODAY = "2026-10-14";
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

const day = (date: string) => screen.getByTestId(`calendar-day-${date}`);

// A calendar the way the screen holds it: the range and the weekdays live above it.
function Harness({
  initial = { startDate: null, endDate: null },
  onRange = jest.fn(),
  onWeekdays = jest.fn(),
}: {
  initial?: DateRange;
  onRange?: (range: DateRange) => void;
  onWeekdays?: (weekdays: number[]) => void;
}) {
  const [range, setRange] = useState(initial);
  const [weekdays, setWeekdays] = useState(ALL_DAYS);

  return (
    <DateRangeCalendar
      today={TODAY}
      {...range}
      weekdays={weekdays}
      onRangeChange={(next) => {
        setRange(next);
        onRange(next);
      }}
      onWeekdaysChange={(next) => {
        setWeekdays(next);
        onWeekdays(next);
      }}
    />
  );
}

describe("DateRangeCalendar", () => {
  it("shows today's month, Monday first, and the hint to start", async () => {
    await render(<Harness />);

    expect(screen.getByText("October 2026")).toBeTruthy();
    expect(screen.getByText("Tap a day to start")).toBeTruthy();
    expect(screen.getAllByText("M").length).toBeGreaterThan(0);
    expect(day("2026-10-01")).toBeTruthy();
    expect(day("2026-10-31")).toBeTruthy();
    expect(screen.queryByText("Clear")).toBeNull();
    expect(screen.queryByText("On")).toBeNull();
  });

  it("disables the days before today and the previous-month button on the current month", async () => {
    await render(<Harness />);

    expect(day("2026-10-13")).toBeDisabled();
    expect(day("2026-10-14")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("goes to the next month and back, never before the current one", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("November 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeEnabled();
    expect(day("2026-11-01")).toBeEnabled();

    await user.press(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("October 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("starts the range, then completes it, and shows the weekday filter for a range", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onRange={onRange} />);

    await user.press(day("2026-10-15"));

    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-15", endDate: null });
    expect(screen.getByText(/15 Oct · tap another day for a range/)).toBeTruthy();
    expect(screen.getByText("Clear")).toBeTruthy();
    expect(screen.queryByText("On")).toBeNull();

    await user.press(day("2026-10-17"));

    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-15", endDate: "2026-10-17" });
    expect(screen.getByText("15 Oct – 17 Oct")).toBeTruthy();
    expect(screen.getByText("On")).toBeTruthy();
    expect(day("2026-10-15")).toBeSelected();
    expect(day("2026-10-16")).toBeSelected();
    expect(day("2026-10-17")).toBeSelected();
    expect(day("2026-10-18")).not.toBeSelected();
  });

  it("moves the start on an earlier day and starts over after a range", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onRange={onRange} />);

    await user.press(day("2026-10-20"));
    await user.press(day("2026-10-16"));
    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-16", endDate: null });

    await user.press(day("2026-10-18"));
    await user.press(day("2026-10-25"));
    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-25", endDate: null });
  });

  it("strikes through a day the weekday filter leaves out", async () => {
    const onWeekdays = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onWeekdays={onWeekdays} />);
    await user.press(day("2026-10-15"));
    await user.press(day("2026-10-17"));

    await user.press(screen.getByRole("button", { name: "Sat" }));

    expect(onWeekdays).toHaveBeenCalledWith([1, 2, 3, 4, 5, 7]);
    expect(screen.getByText("17").props.className).toContain("line-through");
    expect(screen.getByText("16").props.className).not.toContain("line-through");
  });

  it("clears the range", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Harness initial={{ startDate: "2026-10-15", endDate: "2026-10-17" }} onRange={onRange} />,
    );

    await user.press(screen.getByText("Clear"));

    expect(onRange).toHaveBeenCalledWith({ startDate: null, endDate: null });
    expect(screen.getByText("Tap a day to start")).toBeTruthy();
  });

  it("opens on the month of the start and writes the month in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(<Harness initial={{ startDate: "2026-12-05", endDate: null }} />);

    expect(screen.getByText("Dezembro 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeEnabled();
  });
});
