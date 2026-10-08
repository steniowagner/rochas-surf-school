import { render, screen, userEvent } from "@testing-library/react-native";

import i18n from "@/i18n";

import { LanguageSheet } from "./language-sheet.component";

jest.useFakeTimers();

describe("LanguageSheet", () => {
  it("shows the title, the description and the supported languages", async () => {
    await render(<LanguageSheet visible onClose={jest.fn()} />);

    expect(screen.getByText("Language")).toBeOnTheScreen();
    expect(screen.getByText("Choose the app language.")).toBeOnTheScreen();
    expect(screen.getByText("English")).toBeOnTheScreen();
    expect(screen.getByText("Español")).toBeOnTheScreen();
    expect(screen.getByText("Português")).toBeOnTheScreen();
  });

  it("marks only the current language as selected", async () => {
    await render(<LanguageSheet visible onClose={jest.fn()} />);

    expect(screen.getAllByRole("button", { selected: true })).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: /English/, selected: true }),
    ).toBeOnTheScreen();
  });

  it("changes the app language and closes when a language is pressed", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<LanguageSheet visible onClose={onClose} />);

    await user.press(screen.getByText("Español"));

    expect(i18n.language).toBe("es-ES");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the sheet in the new language and moves the selection", async () => {
    const user = userEvent.setup();
    await render(<LanguageSheet visible onClose={jest.fn()} />);

    await user.press(screen.getByText("Português"));

    expect(screen.getByText("Idioma")).toBeOnTheScreen();
    expect(screen.getByText("Escolha o idioma do app.")).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: /Português/, selected: true }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: /English/, selected: true }),
    ).not.toBeOnTheScreen();
  });

  it("keeps the language and still closes when the current language is pressed", async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<LanguageSheet visible onClose={onClose} />);

    await user.press(screen.getByText("English"));

    expect(i18n.language).toBe("en-US");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
