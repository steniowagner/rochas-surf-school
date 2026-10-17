import { render, screen, userEvent } from "@testing-library/react-native";

import { glyph } from "../../classes.test-utils";

import { ClassToolsSheet } from "./class-tools-sheet.component";
import type { ClassToolsSheetProps } from "./class-tools-sheet.types";

jest.useFakeTimers();

function props(overrides: Partial<ClassToolsSheetProps> = {}): ClassToolsSheetProps {
  return {
    visible: true,
    onClose: jest.fn(),
    onEdit: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
}

describe("ClassToolsSheet", () => {
  it("shows the title and the three tools with their icons", async () => {
    await render(<ClassToolsSheet {...props()} />);

    expect(screen.getByText("Class tools")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Edit class" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Notify students and instructors" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel class" })).toBeOnTheScreen();
    expect(screen.getByText(glyph("pencil-outline"))).toBeOnTheScreen();
    expect(screen.getByText(glyph("megaphone-outline"))).toBeOnTheScreen();
    expect(screen.getByText(glyph("close-circle-outline"))).toBeOnTheScreen();
  });

  it("closes the sheet, then edits", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ClassToolsSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Edit class" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onEdit).toHaveBeenCalledTimes(1);
    expect(sheet.onCancel).not.toHaveBeenCalled();
  });

  it("closes the sheet, then cancels", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ClassToolsSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Cancel class" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onCancel).toHaveBeenCalledTimes(1);
    expect(sheet.onEdit).not.toHaveBeenCalled();
  });

  it("does nothing when the notify row is pressed", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ClassToolsSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Notify students and instructors" }));

    expect(sheet.onClose).not.toHaveBeenCalled();
    expect(sheet.onEdit).not.toHaveBeenCalled();
    expect(sheet.onCancel).not.toHaveBeenCalled();
    expect(screen.getByText("Class tools")).toBeOnTheScreen();
  });
});
