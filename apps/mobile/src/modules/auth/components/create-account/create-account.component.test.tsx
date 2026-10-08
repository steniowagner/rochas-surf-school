import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { ReactElement } from "react";
import { Platform, TextInput as NativeTextInput } from "react-native";

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

const fetchMock = jest.fn();

const jsonResponse = (status: number, body: unknown) =>
  ({ ok: status < 300, status, json: async () => body }) as Response;

const renderScreen = (ui: ReactElement) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
        })
      }
    >
      {ui}
    </QueryClientProvider>,
  );

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(
    screen.getByPlaceholderText(NAME_PLACEHOLDER),
    ` ${VALID_NAME} `,
  );
  await user.type(
    screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
    ` ${VALID_EMAIL} `,
  );
};

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(202, {}));
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

const getButton = () => screen.getByRole("button", { name: "Get code" });

describe("CreateAccount", () => {
  describe.each([
    ["en-US", "Create account", "Get code"],
    ["es-ES", "Crear cuenta", "Recibir código"],
    ["pt-BR", "Criar conta", "Receber código"],
  ])("in %s", (locale, title, cta) => {
    it("renders the intro and form in each locale", async () => {
      await i18n.changeLanguage(locale);

      await renderScreen(<CreateAccount />);

      expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: cta })).toBeOnTheScreen();
    });
  });

  it("renders the form on Android, where the keyboard does not add padding", async () => {
    const original = Platform.OS;
    Platform.OS = "android";

    await renderScreen(<CreateAccount />);

    expect(getButton()).toBeOnTheScreen();
    Platform.OS = original;
  });

  it("renders the back button, the fields and the terms line", async () => {
    await renderScreen(<CreateAccount />);

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
        await renderScreen(<CreateAccount onCodeRequested={jest.fn()} />);

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
      await renderScreen(<CreateAccount />);

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
      await renderScreen(<CreateAccount />);
      const input = screen.getByPlaceholderText(placeholder);

      await fireEvent.changeText(input, invalid);
      expect(screen.queryByText(message)).toBeNull();

      await fireEvent(input, "blur");

      expect(screen.getByText(message)).toBeOnTheScreen();
    });

    it("hides the error when the value becomes valid", async () => {
      const user = userEvent.setup();
      await renderScreen(<CreateAccount />);
      const input = screen.getByPlaceholderText(placeholder);
      await user.type(input, invalid);
      await fireEvent(input, "blur");

      await user.clear(input);
      await user.type(input, valid);

      expect(screen.queryByText(message)).toBeNull();
    });

    it("does not show an error for an empty field on blur", async () => {
      await renderScreen(<CreateAccount />);

      await fireEvent(screen.getByPlaceholderText(placeholder), "blur");

      expect(screen.queryByText(message)).toBeNull();
    });
  });

  it("focuses the email field on next", async () => {
    const focus = jest.spyOn(NativeTextInput.prototype, "focus");
    await renderScreen(<CreateAccount />);
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
    await renderScreen(<CreateAccount onCodeRequested={onCodeRequested} />);
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
    await renderScreen(<CreateAccount onCodeRequested={onCodeRequested} />);

    await user.press(getButton());

    expect(onCodeRequested).not.toHaveBeenCalled();
  });

  it("calls onCodeRequested when pressing Get code with valid values", async () => {
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await renderScreen(<CreateAccount onCodeRequested={onCodeRequested} />);
    await user.type(screen.getByPlaceholderText(NAME_PLACEHOLDER), VALID_NAME);
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      VALID_EMAIL,
    );

    await user.press(getButton());

    expect(onCodeRequested).toHaveBeenCalledTimes(1);
  });

  describe("requesting the code", () => {
    it("sends email and locale, and calls onCodeRequested on success", async () => {
      const user = userEvent.setup();
      const onCodeRequested = jest.fn();
      await renderScreen(<CreateAccount onCodeRequested={onCodeRequested} />);
      await fillValidForm(user);

      await user.press(getButton());

      await waitFor(() => expect(onCodeRequested).toHaveBeenCalledTimes(1));
      expect(onCodeRequested).toHaveBeenCalledWith({
        name: VALID_NAME,
        email: VALID_EMAIL,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe(
        "http://api.test/auth/email/code",
      );
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        email: VALID_EMAIL,
        locale: "en",
      });
      await waitFor(() => expect(getButton()).toBeEnabled());
    });

    it("treats resend too soon as success", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(429, { errors: ["signInCode.resend.tooSoon"] }),
      );
      const user = userEvent.setup();
      const onCodeRequested = jest.fn();
      await renderScreen(<CreateAccount onCodeRequested={onCodeRequested} />);
      await fillValidForm(user);

      await user.press(getButton());

      await waitFor(() => expect(onCodeRequested).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it.each([
      [
        "invalid email",
        () => jsonResponse(422, { errors: ["signInCode.email.invalid"] }),
        "That email doesn't look right. Check it and try again.",
      ],
      [
        "rate limited",
        () => jsonResponse(429, { errors: ["request.rate.limited"] }),
        "Too many attempts. Wait a minute and try again.",
      ],
      [
        "send failed",
        () => jsonResponse(502, { errors: ["signInCode.email.sendFailed"] }),
        "We couldn't send the email. Please try again.",
      ],
      [
        "no connection",
        () => Promise.reject(new TypeError("Network request failed")),
        "No connection. Check your internet and try again.",
      ],
      [
        "server error",
        () => jsonResponse(500, { errors: ["INTERNAL_SERVER_ERROR"] }),
        "Something went wrong. Please try again.",
      ],
      [
        "invalid locale",
        () => jsonResponse(422, { errors: ["signInCode.locale.invalid"] }),
        "Something went wrong. Please try again.",
      ],
    ])("shows the message for each error (%s)", async (_, answer, message) => {
      fetchMock.mockImplementation(async () => answer());
      const user = userEvent.setup();
      const onCodeRequested = jest.fn();
      await renderScreen(<CreateAccount onCodeRequested={onCodeRequested} />);
      await fillValidForm(user);

      await user.press(getButton());

      expect(await screen.findByText(message)).toBeOnTheScreen();
      expect(onCodeRequested).not.toHaveBeenCalled();
      await waitFor(() => expect(getButton()).toBeEnabled());
    });

    it("shows the error message in pt-BR", async () => {
      await i18n.changeLanguage("pt-BR");
      fetchMock.mockResolvedValue(
        jsonResponse(502, { errors: ["signInCode.email.sendFailed"] }),
      );
      const user = userEvent.setup();
      await renderScreen(<CreateAccount />);
      await user.type(
        screen.getByPlaceholderText("Nome e sobrenome"),
        VALID_NAME,
      );
      await user.type(
        screen.getByPlaceholderText("seu@email.com"),
        VALID_EMAIL,
      );

      await user.press(screen.getByRole("button", { name: "Receber código" }));

      expect(
        await screen.findByText(
          "Não conseguimos enviar o e-mail. Tente de novo.",
        ),
      ).toBeOnTheScreen();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).locale).toBe("pt-BR");
    });

    it("ignores presses while sending", async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      await renderScreen(<CreateAccount />);
      await fillValidForm(user);

      await user.press(getButton());
      await user.press(getButton());

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("hides the error when a field changes", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(500, { errors: ["INTERNAL_SERVER_ERROR"] }),
      );
      const user = userEvent.setup();
      await renderScreen(<CreateAccount />);
      await fillValidForm(user);
      await user.press(getButton());
      await screen.findByText("Something went wrong. Please try again.");

      await user.type(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), "x");

      expect(
        screen.queryByText("Something went wrong. Please try again."),
      ).toBeNull();
    });
  });
});
