import { render, screen, userEvent } from "@testing-library/react-native";

import { glyph } from "../../classes.test-utils";

import { ClassToolsSheet } from "./class-tools-sheet.component";
import type { ClassToolsSheetProps } from "./class-tools-sheet.types";

jest.useFakeTimers();

function props(
  overrides: Partial<ClassToolsSheetProps> = {},
): ClassToolsSheetProps {
  return {
    visible: true,
    onClose: jest.fn(),
    onEdit: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    canDelete: false,
    ...overrides,
  };
}

describe("ClassToolsSheet", () => {
  it("shows the title and the three tools, with no icons", async () => {
    await render(<ClassToolsSheet {...props()} />);

    expect(screen.getByText("Class tools")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Edit class" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Notify students and instructors" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Cancel class" }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(glyph("pencil-outline"))).toBeNull();
    expect(screen.queryByText(glyph("megaphone-outline"))).toBeNull();
    expect(screen.queryByText(glyph("close-circle-outline"))).toBeNull();
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

    await user.press(
      screen.getByRole("button", { name: "Notify students and instructors" }),
    );

    expect(sheet.onClose).not.toHaveBeenCalled();
    expect(sheet.onEdit).not.toHaveBeenCalled();
    expect(sheet.onCancel).not.toHaveBeenCalled();
    expect(screen.getByText("Class tools")).toBeOnTheScreen();
  });

  it("shows no delete tool unless the class can be deleted", async () => {
    await render(<ClassToolsSheet {...props()} />);

    expect(screen.queryByRole("button", { name: "Delete class" })).toBeNull();
  });

  it("shows the delete tool below cancel when the class can be deleted", async () => {
    await render(<ClassToolsSheet {...props({ canDelete: true })} />);

    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.getAllByText(/class$/i).map((node) => node.props.children)).toEqual([
      "Edit class",
      "Cancel class",
      "Delete class",
    ]);
  });

  it("closes the sheet, then deletes", async () => {
    const user = userEvent.setup();
    const sheet = props({ canDelete: true });
    await render(<ClassToolsSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Delete class" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onDelete).toHaveBeenCalledTimes(1);
    expect(sheet.onEdit).not.toHaveBeenCalled();
    expect(sheet.onCancel).not.toHaveBeenCalled();
  });
});
