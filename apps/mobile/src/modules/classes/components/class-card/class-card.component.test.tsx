import { render, screen, userEvent } from "@testing-library/react-native";

import { glyph } from "../../classes.test-utils";
import type { ClassItem } from "../../classes.types";

import { ClassCard } from "./class-card.component";

const item = (overrides: Partial<ClassItem> = {}): ClassItem => ({
  id: "c-1",
  discipline: "surf",
  level: "beginner",
  startsAt: "2026-10-14T13:00:00.000Z", // 10:00 in Fortaleza
  endsAt: "2026-10-14T14:30:00.000Z", // 11:30
  capacity: 8,
  notes: null,
  cancelledAt: null,
  cancellationMessage: null,
  location: { id: "l-1", name: "Praia do Futuro", address: "Av. Zezé Diogo, 1000" },
  instructors: [{ id: "i-1", name: "Ana" }],
  ...overrides,
});

const at = (iso: string) => new Date(iso);
const BEFORE = at("2026-10-14T12:00:00.000Z");
const DURING = at("2026-10-14T13:15:00.000Z");
const AFTER = at("2026-10-14T15:00:00.000Z");

describe("ClassCard", () => {
  it("shows the chips, the time range, the location and the instructor", async () => {
    await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Beginner")).toBeOnTheScreen();
    expect(screen.getByText("10:00 – 11:30")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
    expect(screen.getByText("Ana")).toBeOnTheScreen();
  });

  it("shows the skate chip for skate", async () => {
    await render(
      <ClassCard item={item({ discipline: "skate" })} now={BEFORE} onPress={jest.fn()} />,
    );

    expect(screen.getByText("Skate")).toBeOnTheScreen();
  });

  it("draws the discipline icon and the clock on the state chip", async () => {
    await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);
    expect(screen.getByText(glyph("water-outline"))).toBeOnTheScreen();
    expect(screen.queryByText(glyph("time-outline"))).not.toBeOnTheScreen();
    expect(screen.queryByText(glyph("disc-outline"))).not.toBeOnTheScreen();

    await render(
      <ClassCard item={item({ discipline: "skate" })} now={DURING} onPress={jest.fn()} />,
    );
    expect(screen.getByText(glyph("disc-outline"))).toBeOnTheScreen();
    expect(screen.getByText(glyph("time-outline"))).toBeOnTheScreen();
  });

  it("shows no state chip before the start", async () => {
    await render(<ClassCard item={item()} now={BEFORE} onPress={jest.fn()} />);

    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
    expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
  });

  it("shows In progress while the class is under way", async () => {
    await render(<ClassCard item={item()} now={DURING} onPress={jest.fn()} />);

    expect(screen.getByText("In progress")).toBeOnTheScreen();
    expect(screen.queryByText("Finished")).not.toBeOnTheScreen();
  });

  it("shows Finished after the end", async () => {
    await render(<ClassCard item={item()} now={AFTER} onPress={jest.fn()} />);

    expect(screen.getByText("Finished")).toBeOnTheScreen();
    expect(screen.queryByText("In progress")).not.toBeOnTheScreen();
  });

  it("joins two instructors and counts the rest", async () => {
    const instructors = ["Ana", "Bruno", "Carla"].map((name, index) => ({
      id: `i-${index}`,
      name,
    }));
    await render(<ClassCard item={item({ instructors })} now={BEFORE} onPress={jest.fn()} />);

    expect(screen.getByText("Ana · Bruno +1")).toBeOnTheScreen();
  });

  it("shows two instructors without a counter", async () => {
    const instructors = ["Ana", "Bruno"].map((name, index) => ({ id: `i-${index}`, name }));
    await render(<ClassCard item={item({ instructors })} now={BEFORE} onPress={jest.fn()} />);

    expect(screen.getByText("Ana · Bruno")).toBeOnTheScreen();
  });

  it("shows no footer without instructors", async () => {
    await render(
      <ClassCard item={item({ instructors: [] })} now={BEFORE} onPress={jest.fn()} />,
    );

    expect(screen.queryByText("Ana")).not.toBeOnTheScreen();
  });

  it("opens the class when pressed", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<ClassCard item={item()} now={BEFORE} onPress={onPress} />);

    await user.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledWith("c-1");
  });
});
