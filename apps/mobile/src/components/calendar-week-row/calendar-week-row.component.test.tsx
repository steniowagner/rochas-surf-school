import { render, screen, userEvent } from "@testing-library/react-native";

import { weekDays } from "@/utils/calendar-dates";

import { CalendarWeekRow } from "./calendar-week-row.component";

const DAYS = weekDays("2026-10-12");

const setup = (
  markedDates: string[] = [],
  selectedDate = "2026-10-14",
  today = "2026-10-15",
) => {
  const onSelectDate = jest.fn();

  return {
    onSelectDate,
    ui: (
      <CalendarWeekRow
        days={DAYS}
        selectedDate={selectedDate}
        today={today}
        markedDates={markedDates}
        markedLabel="with classes"
        onSelectDate={onSelectDate}
      />
    ),
  };
};

describe("CalendarWeekRow", () => {
  it("shows the seven days Monday first with the weekday and the number", async () => {
    await render(setup().ui);

    expect(screen.getByText("MON")).toBeOnTheScreen();
    expect(screen.getByText("SUN")).toBeOnTheScreen();
    expect(screen.getByText("12")).toBeOnTheScreen();
    expect(screen.getByText("18")).toBeOnTheScreen();
  });

  it("only the selected day has a background", async () => {
    await render(setup().ui);

    expect(screen.getByTestId("calendar-day-2026-10-14-background").props.className).toContain("bg-grape");

    DAYS.filter((day) => day !== "2026-10-14").forEach((day) => {
      expect(screen.getByTestId(`calendar-day-${day}-background`).props.className).not.toContain("bg-");
    });
  });

  it("marks the selected day for assistive technology", async () => {
    await render(setup([], "2026-10-16").ui);

    expect(screen.getByTestId("calendar-day-2026-10-16")).toBeSelected();
    expect(screen.getByTestId("calendar-day-2026-10-14")).not.toBeSelected();
  });

  it("draws today's number in sun when it isn't selected, and white when it is", async () => {
    const { rerender } = await render(setup().ui);

    expect(screen.getByText("15").props.className).toContain("text-sun");
    expect(screen.getByText("14").props.className).toContain("text-on-color");
    expect(screen.getByText("16").props.className).toContain("text-ink");

    await rerender(setup([], "2026-10-15").ui);

    expect(screen.getByText("15").props.className).toContain("text-on-color");
  });

  it("shows one dot for a day with classes and none for the others", async () => {
    await render(setup(["2026-10-14", "2026-10-15"]).ui);

    expect(screen.queryAllByTestId("calendar-day-2026-10-14-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId("calendar-day-2026-10-15-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId(/-dot$/)).toHaveLength(2);
  });

  it("draws the dot on-color on the selected day and lagoon on the others", async () => {
    await render(setup(["2026-10-14", "2026-10-15"]).ui);

    expect(screen.getByTestId("calendar-day-2026-10-14-dot").props.className).toContain("bg-on-color");
    expect(screen.getByTestId("calendar-day-2026-10-15-dot").props.className).toContain("bg-lagoon");
  });

  it("labels each day with its full date, plus the marked label when it has a dot", async () => {
    await render(setup(["2026-10-15"]).ui);

    expect(screen.getByLabelText("Wednesday, October 14th, 2026")).toBeOnTheScreen();
    expect(screen.getByLabelText("Thursday, October 15th, 2026, with classes")).toBeOnTheScreen();
  });

  it("selects a day when pressed", async () => {
    const { onSelectDate, ui } = setup();
    const user = userEvent.setup();
    await render(ui);

    await user.press(screen.getByTestId("calendar-day-2026-10-17"));

    expect(onSelectDate).toHaveBeenCalledWith("2026-10-17");
  });

  it("shows one dot per class, up to 3, with the counts", async () => {
    await render(
      <CalendarWeekRow
        days={DAYS}
        selectedDate={null}
        today="2026-10-15"
        markedDates={["2026-10-12", "2026-10-13", "2026-10-14"]}
        markedCounts={{ "2026-10-12": 4, "2026-10-13": 2 }}
        onSelectDate={jest.fn()}
      />,
    );

    expect(screen.queryAllByTestId("calendar-day-2026-10-12-dot")).toHaveLength(3);
    expect(screen.queryAllByTestId("calendar-day-2026-10-13-dot")).toHaveLength(2);
    expect(screen.queryAllByTestId("calendar-day-2026-10-14-dot")).toHaveLength(1);
    DAYS.forEach((day) => expect(screen.getByTestId(`calendar-day-${day}`)).not.toBeSelected());
  });
});
