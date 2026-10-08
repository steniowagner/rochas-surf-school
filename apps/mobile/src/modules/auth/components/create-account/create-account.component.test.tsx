import {
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { TextInput as NativeTextInput } from "react-native";

import i18n from "@/i18n";

import { CreateAccount } from "./create-account.component";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.useFakeTimers();

const VALID_NAME = "Ana Silva";
const VALID_EMAIL = "ana.silva@gmail.com";

const NAME_PLACEHOLDER = "First and last name";
const EMAIL_PLACEHOLDER = "you@email.com";

const getButton = () => screen.getByRole("button", { name: "Get code" });

describe("CreateAccount", () => {
  describe.each([
    ["en-US", "Create account", "Get code"],
    ["es-ES", "Crear cuenta", "Recibir código"],
    ["pt-BR", "Criar conta", "Receber código"],
  ])("in %s", (locale, title, cta) => {
    it("renders the intro and form in each locale", async () => {
      await i18n.changeLanguage(locale);

      await render(<CreateAccount />);

      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: cta })).toBeOnTheScreen();
    });
  });

  it("renders the back button, the fields and the terms line", async () => {
    await render(<CreateAccount />);

    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(NAME_PLACEHOLDER)).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(EMAIL_PLACEHOLDER)).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "Terms of Use" }),
    ).toBeOnTheScreen();
  });

  describe("Get code button", () => {
    it.each([
      ["both empty", "", ""],
      ["one word name", "Ana", VALID_EMAIL],
      ["too short name", "Al", VALID_EMAIL],
      ["81-character name", `Ana ${"a".repeat(77)}`, VALID_EMAIL],
      ["email without domain", VALID_NAME, "ana@"],
      ["email without top-level domain", VALID_NAME, "ana.silva@gmail"],
      ["valid email with empty name", "", VALID_EMAIL],
    ])(
      "keeps Get code disabled for invalid values (%s)",
      async (_, name, email) => {
        const user = userEvent.setup();
        await render(<CreateAccount onCodeRequested={jest.fn()} />);

        if (name) {
          await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), name);
        }
        if (email) {
          await user.type(
            screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
            email,
          );
        }

        expect(getButton()).toBeDisabled();
      },
    );

    it.each([
      ["a plain name and email", VALID_NAME, VALID_EMAIL],
      [
        "an accented name and a padded email",
        "Maria-José D'Ávila",
        " Ana@Gmail.com ",
      ],
    ])("enables Get code for valid values (%s)", async (_, name, email) => {
      const user = userEvent.setup();
      await render(<CreateAccount />);

      await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), name);
      await user.type(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), email);

      expect(getButton()).toBeEnabled();
    });
  });

  describe.each([
    [
      "name",
      NAME_PLACEHOLDER,
      "Ana",
      VALID_NAME,
      "Enter your first and last name.",
    ],
    ["email", EMAIL_PLACEHOLDER, "ana@", VALID_EMAIL, "Enter a valid email."],
  ])("%s field", (_, placeholder, invalid, valid, message) => {
    it("shows the field error on blur", async () => {
      await render(<CreateAccount />);
      const input = screen.getByPlaceholderText(placeholder);

      await fireEvent.changeText(input, invalid);
      expect(screen.queryByText(message)).toBeNull();

      await fireEvent(input, "blur");

      expect(screen.getByText(message)).toBeOnTheScreen();
    });

    it("hides the error when the value becomes valid", async () => {
      const user = userEvent.setup();
      await render(<CreateAccount />);
      const input = screen.getByPlaceholderText(placeholder);
      await user.type(input, invalid);
      await fireEvent(input, "blur");

      await user.clear(input);
      await user.type(input, valid);

      expect(screen.queryByText(message)).toBeNull();
    });

    it("does not show an error for an empty field on blur", async () => {
      await render(<CreateAccount />);

      await fireEvent(screen.getByPlaceholderText(placeholder), "blur");

      expect(screen.queryByText(message)).toBeNull();
    });
  });

  it("focuses the email field on next", async () => {
    const focus = jest.spyOn(NativeTextInput.prototype, "focus");
    await render(<CreateAccount />);
    focus.mockClear();

    await fireEvent(
      screen.getByPlaceholderText(NAME_PLACEHOLDER),
      "submitEditing",
    );

    expect(focus).toHaveBeenCalledTimes(1);
    focus.mockRestore();
  });

  it("submits on done only when valid", async () => {
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await render(<CreateAccount onCodeRequested={onCodeRequested} />);
    const email = screen.getByPlaceholderText(EMAIL_PLACEHOLDER);

    await user.type(email, "ana@", { submitEditing: true });
    expect(onCodeRequested).not.toHaveBeenCalled();

    await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), VALID_NAME);
    await user.clear(email);
    await user.type(email, ` ${VALID_EMAIL} `, { submitEditing: true });

    expect(onCodeRequested).toHaveBeenCalledWith({
      name: VALID_NAME,
      email: VALID_EMAIL,
    });
  });

  it("does nothing when pressing Get code with invalid values", async () => {
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await render(<CreateAccount onCodeRequested={onCodeRequested} />);

    await user.press(getButton());

    expect(onCodeRequested).not.toHaveBeenCalled();
  });

  it("calls onCodeRequested when pressing Get code with valid values", async () => {
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await render(<CreateAccount onCodeRequested={onCodeRequested} />);
    await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), VALID_NAME);
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      VALID_EMAIL,
    );

    await user.press(getButton());

    expect(onCodeRequested).toHaveBeenCalledTimes(1);
  });
});
