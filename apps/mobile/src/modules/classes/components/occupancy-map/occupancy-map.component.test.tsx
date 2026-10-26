import {
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";

import { buildClassItem } from "../../classes.test-utils";
import type { ClassItem } from "../../classes.types";
import { OccupancyMap } from "./occupancy-map.component";

const CANCELLED_AT = "2026-10-20T10:00:00.000Z";

const make = (
  id: string,
  startsAt: string,
  overrides: Partial<ClassItem> = {},
) => buildClassItem(id, startsAt, startsAt, overrides);

// Monday 19 Oct 2026, 08:00 in Fortaleza is 11:00Z.
const A = make("A", "2026-10-19T11:00:00.000Z", {
  seatsTaken: 3,
  capacity: 10,
});
const B = make("B", "2026-10-19T11:00:00.000Z", {
  seatsTaken: 5,
  capacity: 10,
  discipline: "skate",
});
const C = make("C", "2026-10-21T11:00:00.000Z", {
  seatsTaken: 89,
  capacity: 100,
});
const D = make("D", "2026-10-23T19:00:00.000Z", {
  seatsTaken: 9,
  capacity: 10,
});
const E = make("E", "2026-10-24T19:00:00.000Z", {
  seatsTaken: 2,
  capacity: 10,
  cancelledAt: CANCELLED_AT,
  discipline: "skate",
});
const F = make("F", "2026-10-25T19:00:00.000Z", { seatsTaken: 4, capacity: 4 });

const renderMap = (
  onSelect = jest.fn(),
  selectedId: string | null = null,
  today = "2026-10-21",
) =>
  render(
    <OccupancyMap
      weekStart="2026-10-19"
      today={today}
      classes={[A, B, C, D, E, F]}
      selectedId={selectedId}
      onSelect={onSelect}
    />,
  );

const empties = () =>
  screen.queryAllByTestId(/^occupancy-empty-/, { includeHiddenElements: true });
const box = (id: string) =>
  screen.getByTestId(`occupancy-cell-box-${id}`).props.className as string;

describe("OccupancyMap", () => {
  it("shows the seven days with today's number in sun", async () => {
    await renderMap();

    expect(screen.getByText("MON")).toBeOnTheScreen();
    expect(screen.getByText("SUN")).toBeOnTheScreen();
    expect(
      screen.getByTestId("occupancy-day-2026-10-21").props.className,
    ).toContain("text-sun");
    expect(screen.getByTestId("occupancy-day-2026-10-21")).toHaveTextContent(
      "21",
    );
    expect(
      screen.getByTestId("occupancy-day-2026-10-19").props.className,
    ).toContain("text-ink");
    expect(
      screen.getByTestId("occupancy-day-2026-10-19").props.className,
    ).not.toContain("text-sun");
  });

  it("marks no day in sun when the week does not hold today", async () => {
    await renderMap(jest.fn(), null, "2026-11-02");

    for (const day of ["19", "20", "21", "22", "23", "24", "25"]) {
      expect(
        screen.getByTestId(`occupancy-day-2026-10-${day}`).props.className,
      ).not.toContain("text-sun");
    }
  });

  it("shows a row per start time, the time only on the first sub-row", async () => {
    await renderMap();

    expect(screen.getAllByText("08:00")).toHaveLength(1);
    expect(screen.getAllByText("16:00")).toHaveLength(1);
    // A and B share Monday 08:00, so that time has two sub-rows: 5 + 6 empty slots there and 4 on the 16:00 row.
    expect(empties()).toHaveLength(15);
  });

  it.each([
    ["A", "30%", "bg-info-tint", "text-lagoon"],
    ["B", "50%", "bg-sun-tint", "text-ink"],
    ["C", "89%", "bg-sun-tint", "text-ink"],
    ["D", "90%", "bg-sun", "text-on-color"],
    ["F", "100%", "bg-bad", "text-on-color"],
    ["E", "canc.", "bg-dim", "text-ink-3"],
  ])("draws class %s as %s on %s", async (id, text, fill, ink) => {
    await renderMap();

    expect(box(id)).toContain(fill);
    expect(screen.getByText(text).props.className).toContain(ink);
    expect(screen.getByTestId(`occupancy-cell-${id}`)).toHaveTextContent(text);
  });

  it("draws the cancelled class struck through and bordered", async () => {
    await renderMap();

    expect(box("E")).toContain("border-line");
    expect(screen.getByText("canc.").props.className).toContain("line-through");
  });

  it("borders the selected cell in grape only", async () => {
    await renderMap(jest.fn(), "E");

    expect(box("E")).toContain("border-grape");
    expect(box("E")).not.toContain("border-line");
    expect(
      screen.getByTestId("occupancy-cell-E").props.accessibilityState,
    ).toEqual({ selected: true });
    expect(box("A")).not.toContain("border-grape");
    expect(
      screen.getByTestId("occupancy-cell-A").props.accessibilityState,
    ).toEqual({ selected: false });
  });

  it("labels the cells for a screen reader", async () => {
    await renderMap();

    expect(
      screen.getByTestId("occupancy-cell-A").props.accessibilityLabel,
    ).toBe("MON 19, 08:00, Surf, 30%");
    expect(
      screen.getByTestId("occupancy-cell-E").props.accessibilityLabel,
    ).toBe("SAT 24, 16:00, Skate, cancelled");
    expect(screen.getByTestId("occupancy-cell-A").props.accessibilityRole).toBe(
      "button",
    );
  });

  it("calls onSelect with the tapped class, cancelled ones too", async () => {
    const onSelect = jest.fn();
    await renderMap(onSelect);

    await userEvent.press(screen.getByTestId("occupancy-cell-C"));
    await userEvent.press(screen.getByTestId("occupancy-cell-E"));

    expect(onSelect).toHaveBeenNthCalledWith(1, "C");
    expect(onSelect).toHaveBeenNthCalledWith(2, "E");
  });

  it("hides the empty slots from a screen reader and does not make them pressable", async () => {
    const onSelect = jest.fn();
    await renderMap(onSelect);

    const [empty] = empties();
    expect(empty.props.accessibilityElementsHidden).toBe(true);
    expect(empty.props.importantForAccessibility).toBe("no-hide-descendants");
    // The border sits on an inner view, so the slot's width is the same as a class cell's (D-06: 7 equal columns).
    expect(empty.props.className).toBe("h-11 flex-1");
    const [dashed] = within(empty).queryAllByTestId(/^occupancy-dashed-/, {
      includeHiddenElements: true,
    });
    expect(dashed.props.className).toContain("border-dashed");
    expect(screen.queryAllByRole("button")).toHaveLength(6);
    await userEvent.press(empty);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows the legend", async () => {
    await renderMap();

    for (const label of ["under 50%", "50–89%", "90%+", "Full"]) {
      expect(screen.getByText(label)).toBeOnTheScreen();
    }
    const swatches = {
      low: "bg-info-tint",
      mid: "bg-sun-tint",
      high: "bg-sun",
      full: "bg-bad",
    };
    for (const [key, fill] of Object.entries(swatches)) {
      const { className } = screen.getByTestId(
        `occupancy-legend-swatch-${key}`,
      ).props;
      expect(className).toContain(fill);
      expect(className).toContain("rounded-swatch");
    }
  });
});
