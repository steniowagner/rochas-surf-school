import { render, screen, userEvent } from "@testing-library/react-native";

import { TimeRangePicker } from "./time-range-picker.component";

const morning = { start: "08:00", end: "09:00" };
const afternoon = { start: "16:00", end: "17:00" };

const props = {
  suggestions: [morning, afternoon],
  added: [],
  selected: [],
  nowMinutes: null,
  onToggle: jest.fn(),
  onAddPress: jest.fn(),
};

describe("TimeRangePicker", () => {
  it("shows the suggestions as chips with the hint, and the add button", async () => {
    await render(<TimeRangePicker {...props} />);

    expect(screen.getByRole("button", { name: "08:00 – 09:00" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "16:00 – 17:00" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "New time" })).toBeTruthy();
    expect(screen.getByText("Suggested from last week's classes.")).toBeTruthy();
    expect(screen.queryByText("Times that already passed today have no class today.")).toBeNull();
    expect(screen.queryByText("Overlapping times can't go in the same batch.")).toBeNull();
  });

  it("shows only the add button, and no hint, when there are no suggestions", async () => {
    await render(<TimeRangePicker {...props} suggestions={[]} />);

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "New time" })).toBeTruthy();
    expect(screen.queryByText("Suggested from last week's classes.")).toBeNull();
  });

  it("toggles a range and opens the sheet", async () => {
    const onToggle = jest.fn();
    const onAddPress = jest.fn();
    const user = userEvent.setup();
    await render(<TimeRangePicker {...props} onToggle={onToggle} onAddPress={onAddPress} />);

    await user.press(screen.getByRole("button", { name: "16:00 – 17:00" }));
    await user.press(screen.getByRole("button", { name: "New time" }));

    expect(onToggle).toHaveBeenCalledWith(afternoon);
    expect(onAddPress).toHaveBeenCalled();
  });

  it("lists the added ranges with the suggestions, selected ones marked, and the overlap hint", async () => {
    const added = { start: "08:30", end: "09:30" };
    await render(<TimeRangePicker {...props} added={[added]} selected={[morning]} />);

    expect(screen.getByRole("button", { name: "08:00 – 09:00" })).toBeSelected();
    expect(screen.getByRole("button", { name: "16:00 – 17:00" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "08:30 – 09:30" })).toBeDisabled();
    expect(screen.getByText("Overlapping times can't go in the same batch.")).toBeTruthy();
  });

  it("keeps the ranges that started pressable when today is among the dates, and says they have no class today", async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();
    await render(<TimeRangePicker {...props} nowMinutes={10 * 60} onToggle={onToggle} />);

    expect(screen.getByRole("button", { name: "08:00 – 09:00" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "16:00 – 17:00" })).toBeEnabled();
    expect(screen.getByText("Times that already passed today have no class today.")).toBeTruthy();

    await user.press(screen.getByRole("button", { name: "08:00 – 09:00" }));

    expect(onToggle).toHaveBeenCalledWith(morning);
  });

  describe("single", () => {
    it("selects the pressed range and keeps the selected one when it is pressed again", async () => {
      const onToggle = jest.fn();
      const user = userEvent.setup();
      await render(<TimeRangePicker {...props} single selected={[morning]} onToggle={onToggle} />);

      await user.press(screen.getByRole("button", { name: "08:00 – 09:00" }));
      expect(onToggle).not.toHaveBeenCalled();

      await user.press(screen.getByRole("button", { name: "16:00 – 17:00" }));
      expect(onToggle).toHaveBeenCalledWith(afternoon);
    });

    it("does not block an overlapping range and shows no overlap or past hint", async () => {
      const added = { start: "08:30", end: "09:30" };
      await render(
        <TimeRangePicker {...props} single added={[added]} selected={[morning]} nowMinutes={null} />,
      );

      expect(screen.getByRole("button", { name: "08:30 – 09:30" })).toBeEnabled();
      expect(screen.queryByText("Overlapping times can't go in the same batch.")).toBeNull();
      expect(screen.getByText("Suggested from last week's classes.")).toBeTruthy();
    });

    it("blocks the ranges that started today, except the selected one and the class's own", async () => {
      const early = { start: "06:00", end: "07:00" };
      await render(
        <TimeRangePicker
          {...props}
          single
          suggestions={[early, morning, afternoon]}
          selected={[afternoon]}
          ownRange={morning}
          nowMinutes={10 * 60}
        />,
      );

      expect(screen.getByRole("button", { name: "06:00 – 07:00" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "08:00 – 09:00" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "16:00 – 17:00" })).toBeEnabled();
      expect(screen.queryByText("Times that already passed today have no class today.")).toBeNull();
    });

    it("blocks a started range when there is no own range, and nothing on another day", async () => {
      const { rerender } = await render(
        <TimeRangePicker {...props} single selected={[afternoon]} nowMinutes={10 * 60} />,
      );
      expect(screen.getByRole("button", { name: "08:00 – 09:00" })).toBeDisabled();

      await rerender(<TimeRangePicker {...props} single selected={[afternoon]} nowMinutes={null} />);
      expect(screen.getByRole("button", { name: "08:00 – 09:00" })).toBeEnabled();
    });
  });
});
