import { render, screen, userEvent } from "@testing-library/react-native";

import { HistoryListHeader } from "./history-list-header.component";

const setup = (dayLabel: string | null) => {
  const onClearDay = jest.fn();

  return {
    onClearDay,
    ui: (
      <HistoryListHeader
        title="All classes"
        caption="OCTOBER 2026"
        dayLabel={dayLabel}
        clearDayLabel="Clear 14 OCT"
        onClearDay={onClearDay}
      />
    ),
  };
};

describe("HistoryListHeader", () => {
  it("shows the title and the period's caption without a selected day", async () => {
    await render(setup(null).ui);

    expect(screen.getByRole("header", { name: "All classes" })).toBeOnTheScreen();
    expect(screen.getByText("OCTOBER 2026")).toBeOnTheScreen();
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  it("replaces the caption with the day's chip, at least 44 pt, that clears the day", async () => {
    const { onClearDay, ui } = setup("14 OCT");
    const user = userEvent.setup();
    await render(ui);

    expect(screen.queryByText("OCTOBER 2026")).not.toBeOnTheScreen();
    expect(screen.getByText("14 OCT")).toBeOnTheScreen();
    expect(screen.getByTestId("history-day-chip").props.className).toContain("bg-info-tint");
    expect(screen.getByText("14 OCT").props.className).toContain("text-lagoon");
    const chip = screen.getByRole("button", { name: "Clear 14 OCT" });
    expect(screen.getByTestId("history-day-chip-target").props.className).toContain("min-h-11 min-w-11");

    await user.press(chip);

    expect(onClearDay).toHaveBeenCalledTimes(1);
  });
});
