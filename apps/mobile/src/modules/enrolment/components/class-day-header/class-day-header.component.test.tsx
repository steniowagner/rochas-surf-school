import { render, screen } from "@testing-library/react-native";

import { ClassDayHeader } from "./class-day-header.component";
import type { ClassDayHeaderProps } from "./class-day-header.types";

const PROPS: ClassDayHeaderProps = {
  discipline: "surf",
  level: "advanced",
  startsAt: "2026-10-21T11:00:00.000Z",
  endsAt: "2026-10-21T12:30:00.000Z",
  locationName: "Praia do Futuro",
};

describe("ClassDayHeader", () => {
  it("shows the day, the chips, the time range and the location", async () => {
    await render(<ClassDayHeader {...PROPS} />);

    expect(screen.getByText("WED")).toBeOnTheScreen();
    expect(screen.getByText("21")).toBeOnTheScreen();
    expect(screen.getByText("Surf")).toBeOnTheScreen();
    expect(screen.getByText("Advanced")).toBeOnTheScreen();
    expect(screen.getByText("08:00 – 09:30")).toBeOnTheScreen();
    expect(screen.getByText("Praia do Futuro")).toBeOnTheScreen();
  });

  it("shows only the uppercase month by default", async () => {
    await render(<ClassDayHeader {...PROPS} />);

    expect(screen.getByText("OCT").props.className).not.toContain("lowercase");
    expect(screen.queryByText(/2026/)).toBeNull();
  });

  it("adds the year in lowercase with showYear", async () => {
    await render(<ClassDayHeader {...PROPS} showYear />);

    expect(screen.getByText("OCT 2026")).toHaveProp(
      "className",
      expect.stringContaining("lowercase"),
    );
  });

  it("uses the skate chip for a skate class", async () => {
    await render(<ClassDayHeader {...PROPS} discipline="skate" />);

    expect(screen.getByText("Skate")).toBeOnTheScreen();
  });
});
