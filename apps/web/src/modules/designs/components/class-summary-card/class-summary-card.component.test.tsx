import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ClassSummaryCard } from "./class-summary-card.component";
import type { ClassSummaryCardProps } from "./class-summary-card.types";

const props: ClassSummaryCardProps = {
  locale: "pt-br",
  discipline: "surf",
  level: "beginner",
  dateLabel: "Quarta-feira · 9 set",
  timeRange: "08:00 – 09:30",
  locationName: "Praia de Iracema",
};

describe("ClassSummaryCard", () => {
  it("shows the category, level, time, day and location", () => {
    render(<ClassSummaryCard {...props} />);

    expect(screen.getByText("Surf")).toBeInTheDocument();
    expect(screen.getByText("Iniciante")).toBeInTheDocument();
    expect(screen.getByText("08:00 – 09:30")).toBeInTheDocument();
    expect(screen.getByText("Quarta-feira · 9 set")).toBeInTheDocument();
    expect(screen.getByText("Praia de Iracema")).toBeInTheDocument();
  });

  it("draws its own card by default", () => {
    render(<ClassSummaryCard {...props} />);

    expect(screen.getByTestId("class-summary-card")).toHaveClass("rounded-card");
  });

  it("drops the card when embedded", () => {
    render(<ClassSummaryCard {...props} embedded />);

    expect(screen.getByTestId("class-summary-card")).not.toHaveClass("rounded-card");
  });
});
