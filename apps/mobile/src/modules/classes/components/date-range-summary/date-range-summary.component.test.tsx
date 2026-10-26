import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

import { DateRangeSummary } from "./date-range-summary.component";

const base = {
  startDate: null,
  endDate: null,
  excludedDates: [] as string[],
  onClear: jest.fn(),
};

describe("DateRangeSummary", () => {
  it("asks for the first day when nothing is picked, with nothing to clear", async () => {
    await render(<DateRangeSummary {...base} />);

    expect(screen.getByText("Tap a day to start")).toBeTruthy();
    expect(screen.queryByText("Clear")).toBeNull();
  });

  it("asks for the last day once the first is picked, and can clear it", async () => {
    const onClear = jest.fn();
    const user = userEvent.setup();
    await render(
      <DateRangeSummary {...base} startDate="2026-10-15" onClear={onClear} />,
    );

    expect(
      screen.getByText("15 Oct · tap another day for a range"),
    ).toBeTruthy();
    await user.press(screen.getByRole("button", { name: "Clear" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("shows that no day was removed, and how to remove one, without repeating the interval", async () => {
    await render(
      <DateRangeSummary
        {...base}
        startDate="2026-10-15"
        endDate="2026-10-22"
      />,
    );

    expect(screen.queryByText("Range")).toBeNull();
    expect(screen.queryByText("15 Oct")).toBeNull();
    expect(screen.queryByText("22 Oct")).toBeNull();
    expect(screen.getByText("Removed days")).toBeTruthy();
    expect(screen.getByText("No days removed")).toBeTruthy();
    expect(
      screen.getByText(
        "Tap a day in the range to remove it. Tap it again to put it back.",
      ),
    ).toBeTruthy();
  });

  it("lists the removed days and clears the selection", async () => {
    const onClear = jest.fn();
    const user = userEvent.setup();
    await render(
      <DateRangeSummary
        {...base}
        startDate="2026-10-15"
        endDate="2026-10-22"
        excludedDates={["2026-10-16", "2026-10-21"]}
        onClear={onClear}
      />,
    );

    expect(screen.getByText("Removed days")).toBeTruthy();
    expect(screen.getByTestId("excluded-2026-10-16")).toHaveTextContent(
      "16 Oct",
    );
    expect(screen.getByTestId("excluded-2026-10-21")).toHaveTextContent(
      "21 Oct",
    );
    expect(screen.queryByText("No days removed")).toBeNull();

    await user.press(screen.getByRole("button", { name: "Clear" }));

    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("writes the dates in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(
      <DateRangeSummary
        {...base}
        startDate="2026-10-15"
        endDate="2026-10-22"
        excludedDates={["2026-10-16"]}
      />,
    );

    expect(screen.getByText("Dias removidos")).toBeTruthy();
    expect(screen.getByText("Limpar")).toBeTruthy();
    expect(screen.getByTestId("excluded-2026-10-16")).toHaveTextContent(
      "16 out",
    );
  });
});
