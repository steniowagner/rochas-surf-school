import { render, screen, userEvent } from "@testing-library/react-native";

import { OccupancyWeekBar } from "./occupancy-week-bar.component";

const renderBar = async (overrides = {}) => {
  const onPrevious = jest.fn();
  const onNext = jest.fn();

  await render(
    <OccupancyWeekBar
      relativeLabel="This week"
      isCurrentWeek
      caption="19 – 25 OCT"
      onPrevious={onPrevious}
      onNext={onNext}
      {...overrides}
    />,
  );

  return { onPrevious, onNext };
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

  it("has 44 pt round arrows without border or hit slop that press", async () => {
    const user = userEvent.setup();
    const { onPrevious, onNext } = await renderBar();

    const previous = screen.getByRole("button", {
      name: "Show the previous week",
    });
    const next = screen.getByRole("button", { name: "Show the next week" });

    for (const side of ["previous", "next"]) {
      const arrow = screen.getByTestId(`occupancy-week-arrow-${side}`);
      expect(arrow.props.className).toContain("h-11 w-11");
      expect(arrow.props.className).toContain("rounded-full bg-surface");
      expect(arrow.props.className).not.toContain("border");
      expect(previous.props.hitSlop).toBeUndefined();
      expect(next.props.hitSlop).toBeUndefined();
    }

    await user.press(previous);
    await user.press(next);

    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
