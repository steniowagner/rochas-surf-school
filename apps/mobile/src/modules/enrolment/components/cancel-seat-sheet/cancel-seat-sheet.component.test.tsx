import { render, screen, userEvent } from "@testing-library/react-native";

import { CancelSeatSheet } from "./cancel-seat-sheet.component";
import type { CancelSeatSheetProps } from "./cancel-seat-sheet.types";

jest.useFakeTimers();

function props(overrides: Partial<CancelSeatSheetProps> = {}): CancelSeatSheetProps {
  return {
    visible: true,
    loading: false,
    deadline: "Mon, 19 Oct · 20:00",
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe("CancelSeatSheet", () => {
  it("cancel seat: asks with the title, the deadline and both buttons", async () => {
    await render(<CancelSeatSheet {...props()} />);

    expect(screen.getByText("Cancel enrolment")).toBeOnTheScreen();
    expect(
      screen.getByText("Your seat is freed. You can cancel until Mon, 19 Oct · 20:00."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Yes, cancel" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Keep enrolment" })).toBeOnTheScreen();
  });

  it("cancel seat: confirms with Yes, cancel and closes with Keep enrolment", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<CancelSeatSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Yes, cancel" }));
    await user.press(screen.getByRole("button", { name: "Keep enrolment" }));

    expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(sheet.onClose).toHaveBeenCalledTimes(1);
  });

  it("cancel seat: ignores the confirmation while loading", async () => {
    const user = userEvent.setup();
    const sheet = props({ loading: true });
    await render(<CancelSeatSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Yes, cancel" }));

    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });
});
