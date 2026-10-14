import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

import { WeekdayFilter } from "./weekday-filter.component";

describe("WeekdayFilter", () => {
  it("shows the seven weekdays, Monday first, with the ones that are on selected", async () => {
    await render(<WeekdayFilter weekdays={[1, 3]} onChange={jest.fn()} />);

    expect(screen.getByText("On")).toBeTruthy();
    for (const label of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Mon" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Tue" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Wed" })).toBeSelected();
  });

  it("turns a weekday off and on, keeping the list sorted", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<WeekdayFilter weekdays={[1, 6]} onChange={onChange} />);

    await user.press(screen.getByRole("button", { name: "Sat" }));
    await user.press(screen.getByRole("button", { name: "Wed" }));

    expect(onChange).toHaveBeenNthCalledWith(1, [1]);
    expect(onChange).toHaveBeenNthCalledWith(2, [1, 3, 6]);
  });

  it("names the weekdays in the app language", async () => {
    await i18n.changeLanguage("pt-BR");
    await render(<WeekdayFilter weekdays={[]} onChange={jest.fn()} />);

    expect(screen.getByText("Nos dias")).toBeTruthy();
    expect(screen.getByRole("button", { name: "seg" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "dom" })).toBeTruthy();
  });
});
