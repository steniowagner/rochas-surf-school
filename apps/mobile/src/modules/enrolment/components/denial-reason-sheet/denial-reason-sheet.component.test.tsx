import { render, screen, userEvent } from "@testing-library/react-native";

import { DenialReasonSheet } from "./denial-reason-sheet.component";
import type { DenialReasonSheetProps } from "./denial-reason-sheet.types";

jest.useFakeTimers();

function props(overrides: Partial<DenialReasonSheetProps> = {}): DenialReasonSheetProps {
  return {
    visible: true,
    discipline: "surf",
    level: "beginner",
    start: "08:00",
    reason: "This class is advanced level.",
    onClose: jest.fn(),
    ...overrides,
  };
}

describe("DenialReasonSheet", () => {
  it("shows the class, the label and the reason as written", async () => {
    await render(<DenialReasonSheet {...props()} />);

    expect(screen.getByText("Request denied")).toBeOnTheScreen();
    expect(screen.getByText("Surf · Beginner · 08:00")).toBeOnTheScreen();
    expect(screen.getByText("Reason from the school")).toBeOnTheScreen();
    expect(screen.getByText("This class is advanced level.")).toBeOnTheScreen();
  });

  it("says no reason was given when there is none", async () => {
    await render(<DenialReasonSheet {...props({ reason: null })} />);

    expect(screen.getByText("No reason given.")).toBeOnTheScreen();
  });

  it("closes from its button", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<DenialReasonSheet {...props({ onClose })} />);

    await user.press(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
