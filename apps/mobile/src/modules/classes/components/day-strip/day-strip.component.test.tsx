import { render, screen, userEvent } from "@testing-library/react-native";

import { weekDays } from "../../utils/week";

import { DayStrip } from "./day-strip.component";

const DAYS = weekDays("2026-10-12");

const setup = (counts: Record<string, number> = {}, selected = "2026-10-14") => {
  const onSelect = jest.fn();

  return {
    onSelect,
    ui: (
      <DayStrip
        days={DAYS}
        selected={selected}
        today="2026-10-14"
        counts={counts}
        onSelect={onSelect}
      />
    ),
  };
};

describe("DayStrip", () => {
  it("shows the seven days Monday first with the weekday and the number", async () => {
    await render(setup().ui);

    expect(screen.getByText("MON")).toBeOnTheScreen();
    expect(screen.getByText("SUN")).toBeOnTheScreen();
    expect(screen.getByText("12")).toBeOnTheScreen();
    expect(screen.getByText("18")).toBeOnTheScreen();
  });

  it("marks the selected day", async () => {
    await render(setup({}, "2026-10-16").ui);

    expect(screen.getByTestId("day-2026-10-16")).toBeSelected();
    expect(screen.getByTestId("day-2026-10-14")).not.toBeSelected();
  });

  it("shows one dot per class, at most three", async () => {
    await render(setup({ "2026-10-12": 1, "2026-10-13": 2, "2026-10-14": 5 }).ui);

    expect(screen.queryAllByTestId("day-2026-10-12-dot")).toHaveLength(1);
    expect(screen.queryAllByTestId("day-2026-10-13-dot")).toHaveLength(2);
    expect(screen.queryAllByTestId("day-2026-10-14-dot")).toHaveLength(3);
    expect(screen.queryAllByTestId("day-2026-10-15-dot")).toHaveLength(0);
  });

  it("selects a day when pressed", async () => {
    const { onSelect, ui } = setup();
    const user = userEvent.setup();
    await render(ui);

    await user.press(screen.getByTestId("day-2026-10-17"));

    expect(onSelect).toHaveBeenCalledWith("2026-10-17");
  });
});
