import { fireEvent, render, screen, userEvent } from "@testing-library/react-native";

import { TimeRangeSheet } from "./time-range-sheet.component";

const at = (hours: number, minutes = 0) => new Date(2000, 0, 1, hours, minutes);

const change = async (testID: string, date: Date) =>
  await fireEvent(screen.getByTestId(testID), "valueChange", {}, date);

describe("TimeRangeSheet", () => {
  it("opens at 12:00 to 13:00", async () => {
    await render(<TimeRangeSheet visible onClose={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByText("New time")).toBeTruthy();
    expect(screen.getByText(/only|batch/i)).toBeTruthy();
    expect(screen.getByTestId("time-range-start").props.value).toEqual(at(12));
    expect(screen.getByTestId("time-range-end").props.value).toEqual(at(13));
    expect(screen.queryByText(/Duration/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add time" })).toBeEnabled();
  });

  it.each(["time-range-start", "time-range-end"])(
    "gives %s a width, or its wheels can't be touched",
    async (testID) => {
      await render(<TimeRangeSheet visible onClose={jest.fn()} onSubmit={jest.fn()} />);

      expect(screen.getByTestId(testID).props.style).toEqual({ width: "100%" });
    },
  );

  it("adds the chosen range as HH:mm", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<TimeRangeSheet visible onClose={jest.fn()} onSubmit={onSubmit} />);

    await change("time-range-start", at(8, 5));
    await change("time-range-end", at(9));
    await user.press(screen.getByRole("button", { name: "Add time" }));

    expect(onSubmit).toHaveBeenCalledWith({ start: "08:05", end: "09:00" });
  });

  it.each([
    ["before", at(11)],
    ["at", at(12)],
  ])("refuses an end %s the start", async (_name, end) => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<TimeRangeSheet visible onClose={jest.fn()} onSubmit={onSubmit} />);

    await change("time-range-end", end);

    expect(screen.getByText("The end must be after the start.")).toBeTruthy();
    expect(screen.queryByText(/Duration/)).toBeNull();
    expect(screen.getByRole("button", { name: "Add time" })).toBeDisabled();
    await user.press(screen.getByRole("button", { name: "Add time" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cancels", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    await render(<TimeRangeSheet visible onClose={onClose} onSubmit={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
  });

  it("opens again at 12:00 to 13:00 after it was closed", async () => {
    const { rerender } = await render(
      <TimeRangeSheet visible onClose={jest.fn()} onSubmit={jest.fn()} />,
    );
    await change("time-range-start", at(7));

    await rerender(<TimeRangeSheet visible={false} onClose={jest.fn()} onSubmit={jest.fn()} />);
    await rerender(<TimeRangeSheet visible onClose={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByTestId("time-range-start").props.value).toEqual(at(12));
  });
});
