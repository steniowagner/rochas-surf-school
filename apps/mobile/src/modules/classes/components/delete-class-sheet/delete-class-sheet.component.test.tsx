import { render, screen, userEvent } from "@testing-library/react-native";

import { DeleteClassSheet } from "./delete-class-sheet.component";
import type { DeleteClassSheetProps } from "./delete-class-sheet.types";

jest.useFakeTimers();

const CLASS_LINE = "Surf Beginner · Tomorrow, 08:00 – 09:00 · Praia do Futuro";

function props(overrides: Partial<DeleteClassSheetProps> = {}): DeleteClassSheetProps {
  return {
    visible: true,
    variant: "confirm",
    classLine: CLASS_LINE,
    loading: false,
    onConfirm: jest.fn(),
    onCancelInstead: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

describe("DeleteClassSheet", () => {
  it("asks to delete, with the class line, the description and both buttons", async () => {
    await render(<DeleteClassSheet {...props()} />);

    expect(screen.getByText("Delete this class?")).toBeOnTheScreen();
    expect(screen.getByText(CLASS_LINE)).toBeOnTheScreen();
    expect(
      screen.getByText("The instructors are notified and the class leaves the schedule. This can't be undone."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Delete class" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Keep class" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Cancel class" })).not.toBeOnTheScreen();
  });

  it("confirms the deletion", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<DeleteClassSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Delete class" }));

    expect(sheet.onConfirm).toHaveBeenCalledTimes(1);
    expect(sheet.onClose).not.toHaveBeenCalled();
  });

  it("keeps the class without confirming", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<DeleteClassSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Keep class" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it("does not confirm again while loading", async () => {
    const user = userEvent.setup();
    const sheet = props({ loading: true });
    await render(<DeleteClassSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Delete class" }));

    expect(sheet.onConfirm).not.toHaveBeenCalled();
  });

  it("says it can't delete and offers to cancel the class instead", async () => {
    const user = userEvent.setup();
    const sheet = props({ variant: "notEmpty" });
    await render(<DeleteClassSheet {...sheet} />);

    expect(screen.getByText("Can't delete")).toBeOnTheScreen();
    expect(screen.getByText(CLASS_LINE)).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Someone has already asked for a seat or holds one in this class. Only classes with nobody can be deleted — cancel it instead.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Delete class" })).not.toBeOnTheScreen();

    await user.press(screen.getByRole("button", { name: "Cancel class" }));

    expect(sheet.onCancelInstead).toHaveBeenCalledTimes(1);
    expect(sheet.onClose).not.toHaveBeenCalled();
  });

  it("keeps the class from the can't-delete variant", async () => {
    const user = userEvent.setup();
    const sheet = props({ variant: "notEmpty" });
    await render(<DeleteClassSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Keep class" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
  });
});
