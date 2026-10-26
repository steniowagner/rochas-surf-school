import { render, screen, userEvent } from "@testing-library/react-native";

import { OccupancyWeekBar } from "./occupancy-week-bar.component";

const renderBar = async (overrides = {}) => {
  const onPress = jest.fn();

  await render(
    <OccupancyWeekBar
      relativeLabel="This week"
      isCurrentWeek
      caption="19 – 25 OCT"
      onPress={onPress}
      {...overrides}
    />,
  );

  return { onPress };
};

describe("OccupancyWeekBar", () => {
  it("shows the label over the caption, in the sun colour for the current week", async () => {
    await renderBar();

    const label = screen.getByTestId("occupancy-week-label");
    expect(label).toHaveTextContent("This week");
    expect(label.props.className).toContain("text-sun");
    expect(label.props.className).toContain("ds-text-section-label");
    expect(screen.getByText("19 – 25 OCT").props.className).toContain(
      "ds-text-day-number text-ink",
    );
  });

  it("writes the label of another week in the secondary ink", async () => {
    await renderBar({ relativeLabel: "Next week", isCurrentWeek: false });

    const label = screen.getByTestId("occupancy-week-label");
    expect(label).toHaveTextContent("Next week");
    expect(label.props.className).toContain("text-ink-2");
    expect(label.props.className).not.toContain("text-sun");
  });

  it("is one touchable with the calendar icon that opens the calendar", async () => {
    const user = userEvent.setup();
    const { onPress } = await renderBar();

    expect(
      screen.getByTestId("occupancy-week-calendar-icon"),
    ).toBeOnTheScreen();

    await user.press(
      screen.getByRole("button", { name: "Choose another week" }),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
