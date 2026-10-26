import { render, screen } from "@testing-library/react-native";

import { HistoryDayLabel } from "./history-day-label.component";

describe("HistoryDayLabel", () => {
  it("shows the day as a header", async () => {
    await render(<HistoryDayLabel label="FRI, 14 AUG" />);

    expect(screen.getByRole("header", { name: "FRI, 14 AUG" })).toBeOnTheScreen();
  });
});
