import { render, screen, userEvent } from "@testing-library/react-native";

import { WithdrawRequestSheet } from "./withdraw-request-sheet.component";
import type { WithdrawRequestSheetProps } from "./withdraw-request-sheet.types";

jest.useFakeTimers();

function props(overrides: Partial<WithdrawRequestSheetProps> = {}): WithdrawRequestSheetProps {
  return { visible: true, loading: false, onConfirm: jest.fn(), onClose: jest.fn(), ...overrides };
}

describe("WithdrawRequestSheet", () => {
  it("asks with the title, the description and both buttons", async () => {
    await render(<WithdrawRequestSheet {...props()} />);

    expect(screen.getByText("Withdraw request")).toBeOnTheScreen();
    expect(screen.getByText("Your request for this class stops waiting for approval.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Yes, withdraw" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Keep request" })).toBeOnTheScreen();
  });

  it("confirms with Yes, withdraw and closes with Keep request", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<WithdrawRequestSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Yes, withdraw" }));
    await user.press(screen.getByRole("button", { name: "Keep request" }));

    expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(sheet.onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores the confirmation while loading", async () => {
    const user = userEvent.setup();
    const sheet = props({ loading: true });
    await render(<WithdrawRequestSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Yes, withdraw" }));

    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });
});
