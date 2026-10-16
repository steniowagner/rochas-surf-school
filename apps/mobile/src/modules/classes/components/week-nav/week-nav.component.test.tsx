import { render, screen, userEvent } from "@testing-library/react-native";

import { WeekNav } from "./week-nav.component";

const setup = (showToday: boolean) => {
  const handlers = { onPrevious: jest.fn(), onNext: jest.fn(), onToday: jest.fn() };

  return { handlers, ui: <WeekNav caption="12 Oct – 18 Oct" showToday={showToday} {...handlers} /> };
};

describe("WeekNav", () => {
  it("shows the caption and calls the arrows", async () => {
    const { handlers, ui } = setup(false);
    const user = userEvent.setup();
    await render(ui);

    expect(screen.getByText("12 Oct – 18 Oct")).toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Show the previous week" }));
    await user.press(screen.getByRole("button", { name: "Show the next week" }));

    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
  });

  it("hides Today while the current week is shown", async () => {
    await render(setup(false).ui);

    expect(screen.queryByRole("button", { name: "Today" })).not.toBeOnTheScreen();
  });

  it("shows Today for another week and calls it", async () => {
    const { handlers, ui } = setup(true);
    const user = userEvent.setup();
    await render(ui);

    await user.press(screen.getByRole("button", { name: "Today" }));

    expect(handlers.onToday).toHaveBeenCalledTimes(1);
  });
});
