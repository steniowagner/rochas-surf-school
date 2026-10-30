import { render, screen } from "@testing-library/react-native";

import { ClassSummaryCard } from "./class-summary-card.component";
import type { ClassSummaryCardProps } from "./class-summary-card.types";

const PROPS: ClassSummaryCardProps = {
  discipline: "surf",
  level: "beginner",
  dateLabel: "Tomorrow · 15 Oct",
  timeRange: "08:00 – 09:00",
  locationName: "Praia do Futuro",
};

describe("ClassSummaryCard", () => {
  it("shows the category, level, time, day and location", async () => {
    await render(<ClassSummaryCard {...PROPS} />);

    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("08:00 – 09:00")).toBeOnTheScreen();
    expect(screen.getByText("Tomorrow · 15 Oct")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
  });

  it("draws its own card by default", async () => {
    await render(<ClassSummaryCard {...PROPS} />);

    expect(screen.getByTestId("class-summary-card").props.className).toContain(
      "rounded-card",
    );
  });

  it("drops the card when embedded", async () => {
    await render(<ClassSummaryCard {...PROPS} embedded />);

    expect(
      screen.getByTestId("class-summary-card").props.className,
    ).not.toContain("rounded-card");
  });
});
