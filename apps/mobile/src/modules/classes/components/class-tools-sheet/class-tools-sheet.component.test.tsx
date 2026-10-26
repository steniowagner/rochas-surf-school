import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

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
    onNotify: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    messageCount: 3,
    deleteState: "available",
    ...overrides,
  };
}

describe("ClassToolsSheet", () => {
  it("shows the title and the four cards in two rows, with their icons and subtitles", async () => {
    await render(<ClassToolsSheet {...props()} />);

    expect(screen.getByText("Class tools")).toBeOnTheScreen();
    expect(
      screen
        .getAllByRole("button")
        .map((card) => card.props.accessibilityLabel),
    ).toEqual(["Edit class", "Send message", "Cancel class", "Delete class"]);
    expect(screen.getByText("Date, time, place…")).toBeOnTheScreen();
    expect(screen.getByText("3 people")).toBeOnTheScreen();
    expect(screen.getByText("Notifies 3 people")).toBeOnTheScreen();
    expect(screen.getByText("Nobody enrolled")).toBeOnTheScreen();
    expect(screen.getByText(glyph("pencil-outline"))).toBeOnTheScreen();
    expect(screen.getByText(glyph("chatbubble-outline"))).toBeOnTheScreen();
    expect(screen.getByText(glyph("close-circle-outline"))).toBeOnTheScreen();
    expect(screen.getByText(glyph("trash-outline"))).toBeOnTheScreen();
  });

  it("draws Cancel class in the danger tone", async () => {
    await render(<ClassToolsSheet {...props()} />);

    expect(screen.getByText("Cancel class").props.className).toContain(
      "text-bad",
    );
    expect(screen.getByText("Edit class").props.className).not.toContain(
      "text-bad",
    );
  });

  it("reads one person in the singular", async () => {
    await render(<ClassToolsSheet {...props({ messageCount: 1 })} />);

    expect(screen.getByText("1 person")).toBeOnTheScreen();
    expect(screen.getByText("Notifies 1 person")).toBeOnTheScreen();
  });

  it("reads nobody when there is nobody to reach", async () => {
    await render(<ClassToolsSheet {...props({ messageCount: 0 })} />);

    expect(screen.getByText("Nobody yet")).toBeOnTheScreen();
    expect(screen.getByText("Nobody to notify")).toBeOnTheScreen();
  });

  it.each([
    ["enrolled", "Has people enrolled"],
    ["started", "Already started"],
  ] as const)(
    "disables Delete class when %s, reading why",
    async (deleteState, subtitle) => {
      const user = userEvent.setup();
      const sheet = props({ deleteState });
      await render(<ClassToolsSheet {...sheet} />);

      const card = screen.getByRole("button", { name: "Delete class" });
      expect(screen.getByText(subtitle)).toBeOnTheScreen();
      expect(card).toBeDisabled();

      await user.press(card);

      expect(sheet.onClose).not.toHaveBeenCalled();
      expect(sheet.onDelete).not.toHaveBeenCalled();
    },
  );

  it("closes the sheet, then edits", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ClassToolsSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: "Edit class" }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onEdit).toHaveBeenCalledTimes(1);
    expect(sheet.onCancel).not.toHaveBeenCalled();
  });

  it("closes the sheet, then opens the notice screen", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ClassToolsSheet {...sheet} />);

    await user.press(screen.getByRole("button", { name: /Send message/ }));

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onNotify).toHaveBeenCalledTimes(1);
    expect(sheet.onEdit).not.toHaveBeenCalled();
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

  it("closes the sheet, then deletes when nobody is enrolled", async () => {
    const user = userEvent.setup();
    const sheet = props();
    await render(<ClassToolsSheet {...sheet} />);

    const card = screen.getByRole("button", { name: "Delete class" });
    expect(card).toBeEnabled();

    await user.press(card);

    expect(sheet.onClose).toHaveBeenCalledTimes(1);
    expect(sheet.onDelete).toHaveBeenCalledTimes(1);
    expect(sheet.onEdit).not.toHaveBeenCalled();
    expect(sheet.onCancel).not.toHaveBeenCalled();
  });

  it.each([
    [
      "pt-BR",
      [
        "Editar aula",
        "Data, hora, local…",
        "Enviar mensagem",
        "2 pessoas",
        "Avisa 2 pessoas",
        "Apagar aula",
        "Tem inscritos",
      ],
    ],
    [
      "es-ES",
      [
        "Editar clase",
        "Fecha, hora, lugar…",
        "Enviar mensaje",
        "2 personas",
        "Avisa a 2 personas",
        "Eliminar clase",
        "Tiene inscritos",
      ],
    ],
  ] as const)("reads its own strings in %s", async (language, texts) => {
    try {
      await i18n.changeLanguage(language);
      await render(
        <ClassToolsSheet
          {...props({ messageCount: 2, deleteState: "enrolled" })}
        />,
      );

      for (const text of texts) {
        expect(screen.getByText(text)).toBeOnTheScreen();
      }
    } finally {
      await i18n.changeLanguage("en-US");
    }
  });
});
