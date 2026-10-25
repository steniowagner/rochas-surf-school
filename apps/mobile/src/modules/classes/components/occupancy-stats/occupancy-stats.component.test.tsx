import { render, screen } from "@testing-library/react-native";
import { act } from "react";

import i18n from "@/i18n";

import type { OccupancyStatsFigures } from "../../utils/weekly-occupancy";

import { OccupancyStats } from "./occupancy-stats.component";

const week: OccupancyStatsFigures = {
  percent: 65,
  taken: 22,
  total: 34,
  free: 12,
  fullClasses: 1,
};

afterEach(async () => {
  await act(() => i18n.changeLanguage("en-US"));
});

describe("OccupancyStats", () => {
  it("shows the figures with their labels and colours", async () => {
    await render(<OccupancyStats stats={week} />);

    const figures: [string, string, string, string][] = [
      ["65%", "Occupancy", "text-grape", "occupancy"],
      ["22/34", "Seats", "text-ink", "seats"],
      ["12", "Free", "text-lagoon", "free"],
      ["1", "Full", "text-bad", "full"],
    ];

    for (const [value, label, color] of figures) {
      expect(screen.getByText(value).props.className).toContain(color);
      expect(screen.getByText(value).props.className).toContain(
        "ds-text-day-number",
      );
      expect(screen.getByText(label).props.className).toContain(
        "ds-text-chip text-ink-2",
      );
    }
  });

  it("separates the stats with dividers, none before the first", async () => {
    await render(<OccupancyStats stats={week} />);

    expect(
      screen.getByTestId("occupancy-stat-occupancy").props.className,
    ).not.toContain("border-l");
    for (const id of ["seats", "free", "full"]) {
      expect(
        screen.getByTestId(`occupancy-stat-${id}`).props.className,
      ).toContain("border-l border-line");
    }
  });

  it("reads each stat as one element", async () => {
    await render(<OccupancyStats stats={week} />);

    const read = (id: string) => screen.getByTestId(`occupancy-stat-${id}`);

    expect(read("occupancy").props.accessible).toBe(true);
    expect(read("occupancy").props.accessibilityLabel).toBe("65%, Occupancy");
    expect(read("seats").props.accessibilityLabel).toBe("22 of 34 seats");
    expect(read("free").props.accessibilityLabel).toBe("12 free");
    expect(read("full").props.accessibilityLabel).toBe("1 full");
  });

  it("shows an all-zero week", async () => {
    await render(
      <OccupancyStats
        stats={{ percent: 0, taken: 0, total: 0, free: 0, fullClasses: 0 }}
      />,
    );

    expect(screen.getByText("0%")).toBeOnTheScreen();
    expect(screen.getByText("0/0")).toBeOnTheScreen();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("writes the labels in Portuguese with singular and plural", async () => {
    await act(() => i18n.changeLanguage("pt-BR"));
    await render(<OccupancyStats stats={week} />);

    const read = (id: string) => screen.getByTestId(`occupancy-stat-${id}`);

    expect(screen.getByText("Ocupação")).toBeOnTheScreen();
    expect(screen.getByText("Lugares")).toBeOnTheScreen();
    expect(screen.getByText("Livres")).toBeOnTheScreen();
    expect(screen.getByText("Cheias")).toBeOnTheScreen();
    expect(read("occupancy").props.accessibilityLabel).toBe("65%, Ocupação");
    expect(read("seats").props.accessibilityLabel).toBe("22 de 34 lugares");
    expect(read("free").props.accessibilityLabel).toBe("12 livres");
    expect(read("full").props.accessibilityLabel).toBe("1 cheia");
  });

  it("uses the plural for several full classes", async () => {
    await act(() => i18n.changeLanguage("es-ES"));
    await render(
      <OccupancyStats stats={{ ...week, fullClasses: 3, free: 1 }} />,
    );

    expect(
      screen.getByTestId("occupancy-stat-full").props.accessibilityLabel,
    ).toBe("3 llenas");
    expect(
      screen.getByTestId("occupancy-stat-free").props.accessibilityLabel,
    ).toBe("1 libre");
  });
});
