import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { ReactElement } from "react";

import i18n from "@/i18n";
import { AlertMessageProvider } from "@/providers/alert-message";

import { EmailSignIn } from "./email-sign-in.component";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));
jest.useFakeTimers();

const VALID_EMAIL = "ana.silva@gmail.com";
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
      <AlertMessageProvider>{ui}</AlertMessageProvider>
    </QueryClientProvider>,
  );

const getButton = () => screen.getByRole("button", { name: "Get code" });

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(202, {}));
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("EmailSignIn", () => {
  it("renders the content", async () => {
    await renderScreen(<EmailSignIn />);

    expect(screen.getByRole("header", { name: "Sign in" })).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Use your account's email. We'll send you a code to sign in.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(EMAIL_PLACEHOLDER)).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("link", { name: "Terms of Use" }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
  });

  it.each([
    ["pt-BR", "Entrar", "Receber código", "seu@email.com"],
    ["es-ES", "Entrar", "Recibir código", "tu@correo.com"],
  ])("shows the content in %s", async (locale, title, cta, placeholder) => {
    await i18n.changeLanguage(locale);

    await renderScreen(<EmailSignIn />);

    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: cta })).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(placeholder)).toBeOnTheScreen();
  });

  it("disables Get code until the email is valid", async () => {
    const user = userEvent.setup();
    await renderScreen(<EmailSignIn />);
    const input = screen.getByPlaceholderText(EMAIL_PLACEHOLDER);

    expect(getButton()).toBeDisabled();

    await user.type(input, "ana@");
    expect(getButton()).toBeDisabled();

    await user.clear(input);
    await user.type(input, ` ${VALID_EMAIL} `);
    expect(getButton()).toBeEnabled();
  });

  it("shows the email error after blur", async () => {
    await renderScreen(<EmailSignIn />);
    const input = screen.getByPlaceholderText(EMAIL_PLACEHOLDER);

    await fireEvent.changeText(input, "ana@");
    expect(screen.queryByText("Enter a valid email.")).toBeNull();

    await fireEvent(input, "blur");
    expect(screen.getByText("Enter a valid email.")).toBeOnTheScreen();
  });

  it("does not show an error for an empty email on blur", async () => {
    await renderScreen(<EmailSignIn />);

    await fireEvent(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), "blur");

    expect(screen.queryByText("Enter a valid email.")).toBeNull();
  });

  it("sends the trimmed email and the language", async () => {
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await renderScreen(<EmailSignIn onCodeRequested={onCodeRequested} />);
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      ` ${VALID_EMAIL} `,
    );

    await user.press(getButton());

    await waitFor(() =>
      expect(onCodeRequested).toHaveBeenCalledWith(VALID_EMAIL),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/email/code");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: VALID_EMAIL,
      locale: "en",
    });
  });

  it("submits on done only when valid", async () => {
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await renderScreen(<EmailSignIn onCodeRequested={onCodeRequested} />);
    const input = screen.getByPlaceholderText(EMAIL_PLACEHOLDER);

    await user.type(input, "ana@", { submitEditing: true });
    expect(onCodeRequested).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, VALID_EMAIL, { submitEditing: true });
    await waitFor(() =>
      expect(onCodeRequested).toHaveBeenCalledWith(VALID_EMAIL),
    );
  });

  it("counts a too-soon answer as sent", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, { errors: ["signInCode.resend.tooSoon"] }),
    );
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await renderScreen(<EmailSignIn onCodeRequested={onCodeRequested} />);
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      VALID_EMAIL,
    );

    await user.press(getButton());

    await waitFor(() => expect(onCodeRequested).toHaveBeenCalledTimes(1));
  });

  it.each([
    [
      "rate limited",
      () => jsonResponse(429, { errors: ["request.rate.limited"] }),
      "Too many attempts. Wait a minute and try again.",
    ],
    [
      "no connection",
      () => Promise.reject(new TypeError("Network request failed")),
      "No connection. Check your internet and try again.",
    ],
  ])("shows API errors in a toast (%s)", async (_, answer, message) => {
    fetchMock.mockImplementation(async () => answer());
    const user = userEvent.setup();
    const onCodeRequested = jest.fn();
    await renderScreen(<EmailSignIn onCodeRequested={onCodeRequested} />);
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      VALID_EMAIL,
    );

    await user.press(getButton());

    expect(await screen.findByText(message)).toBeOnTheScreen();
    expect(onCodeRequested).not.toHaveBeenCalled();
    await waitFor(() => expect(getButton()).toBeEnabled());
  });

  it("ignores presses while sending", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    await renderScreen(<EmailSignIn />);
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      VALID_EMAIL,
    );

    await user.press(getButton());
    await user.type(screen.getByPlaceholderText(EMAIL_PLACEHOLDER), "m", {
      submitEditing: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes the trimmed email when Create account is pressed", async () => {
    const user = userEvent.setup();
    const onCreateAccountPress = jest.fn();
    await renderScreen(
      <EmailSignIn onCreateAccountPress={onCreateAccountPress} />,
    );
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      ` ${VALID_EMAIL} `,
    );

    await user.press(screen.getByRole("link", { name: "Create account" }));

    expect(onCreateAccountPress).toHaveBeenCalledWith(VALID_EMAIL);
  });

  it("does nothing when pressed without handlers", async () => {
    const user = userEvent.setup();
    await renderScreen(<EmailSignIn />);
    await user.type(
      screen.getByPlaceholderText(EMAIL_PLACEHOLDER),
      VALID_EMAIL,
    );

    await user.press(screen.getByRole("link", { name: "Create account" }));
    await user.press(getButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });
});
