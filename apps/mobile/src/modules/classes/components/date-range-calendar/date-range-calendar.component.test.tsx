import { render, screen, userEvent, within } from "@testing-library/react-native";
import { useState } from "react";

import i18n from "@/i18n";

import { DateRange, EMPTY_RANGE } from "../../utils/calendar";

import { DateRangeCalendar } from "./date-range-calendar.component";

const TODAY = "2026-10-14";

const day = (date: string) => screen.getByTestId(`calendar-day-${date}`);
const band = (date: string) => screen.getByTestId(`calendar-day-band-${date}`).props.className;

// A calendar the way the screen holds it: the range lives above it.
function Harness({
  initial = EMPTY_RANGE,
  onRange = jest.fn(),
}: {
  initial?: DateRange;
  onRange?: (range: DateRange) => void;
}) {
  const [range, setRange] = useState(initial);

  return (
    <DateRangeCalendar
      today={TODAY}
      {...range}
      onRangeChange={(next) => {
        setRange(next);
        onRange(next);
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

  it("completes the last week with the next month's days, and shows none of the previous month", async () => {
    await render(<Harness />);

    // October 2026 ends on a Saturday: its last week is 26 Oct to 1 Nov.
    expect(day("2026-11-01")).toBeEnabled();
    expect(screen.queryByTestId("calendar-day-2026-11-02")).toBeNull();
    expect(screen.queryByTestId("calendar-day-2026-09-30")).toBeNull();
    expect(within(day("2026-11-01")).getByText("1").props.className).toContain("opacity-60");
    expect(within(day("2026-10-01")).getByText("1").props.className).not.toContain("opacity-60");
  });

  it("shows a full six-week grid with both neighbors in the months after the current one", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByRole("button", { name: "Next month" }));

    // November 2026 starts on a Sunday: the first week begins on 26 Oct, the sixth ends on 6 Dec.
    expect(screen.getByText("November 2026")).toBeTruthy();
    expect(day("2026-10-26")).toBeEnabled();
    expect(day("2026-12-06")).toBeEnabled();
    expect(screen.queryByTestId("calendar-day-2026-12-07")).toBeNull();
    expect(within(day("2026-10-26")).getByText("26").props.className).toContain("opacity-60");
    expect(within(day("2026-11-10")).getByText("10").props.className).not.toContain("opacity-60");
  });

  it("disables the days of the current month that are already past, even when shown in the next one", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(screen.getByRole("button", { name: "Next month" }));

    expect(day("2026-10-26")).toBeEnabled();
    expect(day("2026-10-27")).toBeEnabled();
  });

  it("picks a week that crosses into the next month", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onRange={onRange} />);

    await user.press(day("2026-10-30"));
    await user.press(day("2026-11-01"));

    expect(onRange).toHaveBeenLastCalledWith({
      startDate: "2026-10-30",
      endDate: "2026-11-01",
      excludedDates: [],
    });
    expect(day("2026-10-30")).toBeSelected();
    expect(day("2026-10-31")).toBeSelected();
    expect(day("2026-11-01")).toBeSelected();
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

  it("starts the range, then completes it and shows the removed days section", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onRange={onRange} />);

    await user.press(day("2026-10-15"));

    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-15", endDate: null, excludedDates: [] });
    expect(screen.getByText(/15 Oct · tap another day for a range/)).toBeTruthy();
    expect(screen.getByText("Clear")).toBeTruthy();
    expect(screen.queryByText("Removed days")).toBeNull();

    await user.press(day("2026-10-17"));

    expect(onRange).toHaveBeenLastCalledWith({
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      excludedDates: [],
    });
    expect(screen.getByText("Removed days")).toBeTruthy();
    expect(screen.getByText("No days removed")).toBeTruthy();
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
    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-16", endDate: null, excludedDates: [] });

    await user.press(day("2026-10-18"));
    await user.press(day("2026-10-25"));
    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-25", endDate: null, excludedDates: [] });
  });

  it("draws the band over two adjacent days, rounded at both ends", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    await user.press(day("2026-10-15"));
    await user.press(day("2026-10-16"));

    expect(band("2026-10-15")).toContain("bg-grape-tint rounded-l-full");
    expect(band("2026-10-15")).not.toContain("rounded-r-full");
    expect(band("2026-10-16")).toContain("rounded-r-full");
    expect(band("2026-10-16")).not.toContain("rounded-l-full");
    expect(band("2026-10-17")).not.toContain("bg-grape-tint");
  });

  it("splits the band into a pill per week", async () => {
    const user = userEvent.setup();
    await render(<Harness />);

    // Saturday to the next Monday: the week ends on Sunday and the next one starts on Monday.
    await user.press(day("2026-10-17"));
    await user.press(day("2026-10-19"));

    expect(band("2026-10-17")).toContain("rounded-l-full");
    expect(band("2026-10-17")).not.toContain("rounded-r-full");
    expect(band("2026-10-18")).toContain("rounded-r-full");
    expect(band("2026-10-19")).toContain("rounded-l-full");
    expect(band("2026-10-19")).toContain("rounded-r-full");
  });

  it("removes a day of the range when it is pressed, and puts it back when it is pressed again", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(<Harness onRange={onRange} />);
    await user.press(day("2026-10-15"));
    await user.press(day("2026-10-18"));

    await user.press(day("2026-10-16"));

    expect(onRange).toHaveBeenLastCalledWith({
      startDate: "2026-10-15",
      endDate: "2026-10-18",
      excludedDates: ["2026-10-16"],
    });
    expect(within(day("2026-10-16")).getByText("16").props.className).toContain("line-through");
    expect(within(day("2026-10-17")).getByText("17").props.className).not.toContain("line-through");
    expect(day("2026-10-16")).not.toBeSelected();
    expect(screen.getByTestId("excluded-2026-10-16")).toBeTruthy();
    expect(screen.queryByText("No days removed")).toBeNull();

    await user.press(day("2026-10-16"));

    expect(within(day("2026-10-16")).getByText("16").props.className).not.toContain("line-through");
    expect(day("2026-10-16")).toBeSelected();
    expect(screen.queryByTestId("excluded-2026-10-16")).toBeNull();
    expect(screen.getByText("No days removed")).toBeTruthy();
  });

  it("explains how to remove a day once the range is complete", async () => {
    const user = userEvent.setup();
    await render(<Harness />);
    await user.press(day("2026-10-15"));
    expect(screen.queryByText(/Tap a day in the range to remove it/)).toBeNull();

    await user.press(day("2026-10-18"));

    expect(screen.getByText(/Tap a day in the range to remove it/)).toBeTruthy();
  });

  it.each(["2026-10-15", "2026-10-18"])("removes the whole range when its end %s is pressed", async (end) => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Harness
        initial={{ startDate: "2026-10-15", endDate: "2026-10-18", excludedDates: ["2026-10-16"] }}
        onRange={onRange}
      />,
    );

    await user.press(day(end));

    expect(onRange).toHaveBeenLastCalledWith({ startDate: null, endDate: null, excludedDates: [] });
    expect(band("2026-10-16")).not.toContain("bg-grape-tint");
    expect(day("2026-10-15")).not.toBeSelected();
    expect(day("2026-10-18")).not.toBeSelected();
    expect(screen.getByText("Tap a day to start")).toBeTruthy();
  });

  it("starts over, with nothing removed, on a day outside the range", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Harness
        initial={{ startDate: "2026-10-15", endDate: "2026-10-18", excludedDates: ["2026-10-16"] }}
        onRange={onRange}
      />,
    );

    await user.press(day("2026-10-22"));

    expect(onRange).toHaveBeenLastCalledWith({ startDate: "2026-10-22", endDate: null, excludedDates: [] });
    expect(screen.queryByTestId("excluded-2026-10-16")).toBeNull();
  });

  it("clears the range", async () => {
    const onRange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Harness
        initial={{ startDate: "2026-10-15", endDate: "2026-10-17", excludedDates: ["2026-10-16"] }}
        onRange={onRange}
      />,
    );

    await user.press(screen.getByText("Clear"));

    expect(onRange).toHaveBeenCalledWith({ startDate: null, endDate: null, excludedDates: [] });
    expect(screen.getByText("Tap a day to start")).toBeTruthy();
  });

  it("opens on the month of the start and writes the month in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(<Harness initial={{ startDate: "2026-12-05", endDate: null, excludedDates: [] }} />);

    expect(screen.getByText("Dezembro 2026")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mês anterior" })).toBeEnabled();
  });
});
