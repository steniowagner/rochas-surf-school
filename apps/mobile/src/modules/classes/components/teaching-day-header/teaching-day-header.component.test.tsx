import { render, screen } from "@testing-library/react-native";

import { TeachingDayHeader } from "./teaching-day-header.component";

describe("TeachingDayHeader", () => {
  it("shows the day's name and its short date, read out as one header", async () => {
    await render(<TeachingDayHeader label="Today" date="17 Sep" />);

    expect(screen.getByText("Today")).toBeOnTheScreen();
    expect(screen.getByText("17 Sep")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Today, 17 Sep" }),
    ).toBeOnTheScreen();
  });
});
