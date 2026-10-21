import { render, screen, userEvent } from "@testing-library/react-native";

import { TakeOutSheet } from "./take-out-sheet.component";
import type { TakeOutSheetProps } from "./take-out-sheet.types";

jest.useFakeTimers();

function props(overrides: Partial<TakeOutSheetProps> = {}): TakeOutSheetProps {
  return {
    visible: true,
    firstName: "Ana",
    summary: "Surf Beginner · Tomorrow, 08:00 – 09:00",
    loading: false,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe("TakeOutSheet", () => {
  it("names the student, the class and what happens next", async () => {
    await render(<TakeOutSheet {...props()} />);

    expect(screen.getByText("Take Ana out of the class?")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Surf Beginner · Tomorrow, 08:00 – 09:00. The spot becomes free. The person is notified, with the reason if you write one.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("Reason (optional)")).toBeOnTheScreen();
    expect(screen.getByLabelText("Reason (optional)")).toBeOnTheScreen();
    expect(screen.getByText("0/300")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Take out of the class" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it("confirms with the typed reason", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<TakeOutSheet {...sheet} />);

    await user.type(screen.getByLabelText("Reason (optional)"), "Advanced class.");
    await user.press(screen.getByRole("button", { name: "Take out of the class" }));

    expect(sheet.onConfirm).toHaveBeenCalledWith("Advanced class.");
  });

  it("clears the reason when the sheet closes", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<TakeOutSheet {...sheet} />);
    await user.type(screen.getByLabelText("Reason (optional)"), "Advanced class.");

    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByText("0/300")).toBeOnTheScreen();
  });

  describe("for a trial guest", () => {
    it("names the guest and says nobody is told, with no reason field", async () => {
      await render(<TakeOutSheet {...props({ trial: true, firstName: "Carolina Reis" })} />);

      expect(screen.getByText("Take Carolina Reis out of the class?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          "Surf Beginner · Tomorrow, 08:00 – 09:00. The spot becomes free. This is a trial student with no account — let them know on WhatsApp.",
        ),
      ).toBeOnTheScreen();
      expect(screen.queryByLabelText("Reason (optional)")).toBeNull();
    });

    it("confirms and goes back", async () => {
      const user = userEvent.setup();
      const sheet = props({ trial: true });
      await render(<TakeOutSheet {...sheet} />);

      await user.press(screen.getByRole("button", { name: "Take out of the class" }));
      await user.press(screen.getByRole("button", { name: "Back" }));

      expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
      expect(sheet.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
