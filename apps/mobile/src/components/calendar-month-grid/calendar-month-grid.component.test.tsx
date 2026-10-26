import {
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";

import { CalendarMonthGrid } from "./calendar-month-grid.component";

const OCTOBER = { year: 2026, month: 10 };

const setup = (
  markedDates: string[] = [],
  selectedDate = "2026-10-14",
  month = OCTOBER,
  today = "2026-10-15",
) => {
  const onSelectDate = jest.fn();

  return {
    onSelectDate,
    ui: (
      <CalendarMonthGrid
        month={month}
        selectedDate={selectedDate}
        today={today}
        markedDates={markedDates}
        markedLabel="with classes"
        onSelectDate={onSelectDate}
      />
    ),
  };
};

describe("CalendarMonthGrid", () => {
  it("starts on Monday under the weekday initials", async () => {
    await render(setup().ui);

    expect(screen.getAllByText("M")).toHaveLength(1);
    expect(screen.getAllByText("T")).toHaveLength(2);
    expect(screen.getByTestId("calendar-day-2026-09-28")).toBeOnTheScreen();
  });

  it.each([
    [{ year: 2027, month: 2 }, "2027-02-01", "2027-02-28", 28],
    [{ year: 2026, month: 9 }, "2026-08-31", "2026-10-04", 35],
    [{ year: 2026, month: 8 }, "2026-07-27", "2026-09-06", 42],
  ])("draws only the weeks %j needs", async (month, first, last, days) => {
    await render(setup([], first, month).ui);

    expect(
      screen.getAllByTestId(/^calendar-day-\d{4}-\d{2}-\d{2}$/),
    ).toHaveLength(days);
    expect(screen.getByTestId(`calendar-day-${first}`)).toBeOnTheScreen();
    expect(screen.getByTestId(`calendar-day-${last}`)).toBeOnTheScreen();
  });

  it("draws the adjacent days in ink-3 and those of the month in ink", async () => {
    await render(setup().ui);

    const numberOf = (day: string) =>
      within(screen.getByTestId(`calendar-day-${day}`)).getByText(
        String(Number(day.slice(8))),
      ).props.className;

    expect(numberOf("2026-09-28")).toContain("text-ink-3");
    expect(numberOf("2026-11-01")).toContain("text-ink-3");
    expect(numberOf("2026-10-20")).not.toContain("text-ink-3");
    expect(numberOf("2026-10-20")).toContain("text-ink");
  });

  it("circles the selected day, and draws today's number in sun", async () => {
    await render(setup().ui);

    expect(screen.getByText("14").props.className).toContain("text-on-color");
    expect(screen.getByText("14").parent?.props.className).toContain(
      "bg-grape",
    );
    expect(screen.getByText("15").props.className).toContain("text-sun");
    expect(screen.getByText("15").parent?.props.className).not.toContain("bg-");
    expect(screen.getByTestId("calendar-day-2026-10-14")).toBeSelected();
  });

  it("shows one dot, lagoon, for a day with classes, including adjacent days", async () => {
    await render(setup(["2026-10-14", "2026-10-15", "2026-11-01"]).ui);

    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(3);
    expect(
      screen.getByTestId("calendar-day-2026-10-14-dot").props.className,
    ).toContain("bg-lagoon");
    expect(
      screen.getByTestId("calendar-day-2026-11-01-dot").props.className,
    ).toContain("bg-lagoon");
    expect(
      screen.queryByTestId("calendar-day-2026-10-16-dot"),
    ).not.toBeOnTheScreen();
  });

  it("labels each day with its full date, plus the marked label when it has a dot", async () => {
    await render(setup(["2026-10-15"]).ui);

    expect(
      screen.getByLabelText("Wednesday, October 14th, 2026"),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText("Thursday, October 15th, 2026, with classes"),
    ).toBeOnTheScreen();
  });

  it("selects a day, adjacent ones included, when pressed", async () => {
    const { onSelectDate, ui } = setup();
    const user = userEvent.setup();
    await render(ui);

    await user.press(screen.getByTestId("calendar-day-2026-11-01"));
    await user.press(screen.getByTestId("calendar-day-2026-10-20"));

    expect(onSelectDate).toHaveBeenNthCalledWith(1, "2026-11-01");
    expect(onSelectDate).toHaveBeenNthCalledWith(2, "2026-10-20");
  });

  it("selects no day without a selection", async () => {
    await render(
      <CalendarMonthGrid
        month={OCTOBER}
        selectedDate={null}
        today="2026-10-15"
        markedDates={[]}
        onSelectDate={jest.fn()}
      />,
    );

    expect(screen.getByTestId("calendar-day-2026-10-14")).not.toBeSelected();
    expect(screen.getByText("14").parent?.props.className).not.toContain(
      "bg-grape",
    );
  });
});
