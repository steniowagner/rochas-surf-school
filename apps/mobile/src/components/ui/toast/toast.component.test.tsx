import { act, render, screen } from "@testing-library/react-native";

import { Toast } from "./toast.component";
import { TOAST_EXIT_DURATION, TOAST_VISIBLE_DURATION } from "./toast.hook";

jest.useFakeTimers();

describe("Toast", () => {
  it("shows the message as an alert", async () => {
    await render(<Toast message="Something went wrong" onHidden={jest.fn()} />);

    expect(
      screen.getByText("Something went wrong", { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it("calls onHidden only after the visible and exit durations", async () => {
    const onHidden = jest.fn();
    await render(<Toast message="Something went wrong" onHidden={onHidden} />);

    await act(async () => {
      jest.advanceTimersByTime(TOAST_VISIBLE_DURATION);
    });
    expect(onHidden).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(TOAST_EXIT_DURATION);
    });
    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it("does not call onHidden once unmounted", async () => {
    const onHidden = jest.fn();
    const { unmount } = await render(
      <Toast message="Something went wrong" onHidden={onHidden} />,
    );

    await unmount();
    await act(async () => {
      jest.advanceTimersByTime(TOAST_VISIBLE_DURATION + TOAST_EXIT_DURATION);
    });

    expect(onHidden).not.toHaveBeenCalled();
  });
});
