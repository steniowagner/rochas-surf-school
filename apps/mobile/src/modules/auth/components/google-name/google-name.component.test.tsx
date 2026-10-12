import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { ReactElement } from "react";
import { Keyboard } from "react-native";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import { AlertMessageProvider } from "@/providers/alert-message";

import { GoogleName } from "./google-name.component";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
}));
jest.useFakeTimers();

const NAME_PLACEHOLDER = "First and last name";
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

const getButton = () => screen.getByRole("button", { name: "Continue" });

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(200, { accessToken: "a" }));
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  jest.mocked(router.replace).mockClear();
});

describe("GoogleName", () => {
  it("renders the intro, the back button and Google's name in the field", async () => {
    await renderScreen(<GoogleName idToken="token" initialName="Maria" />);

    expect(
      screen.getByRole("header", { name: "What's your name?" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Enter your full name so the school knows who you are."),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(screen.getByPlaceholderText(NAME_PLACEHOLDER)).toHaveDisplayValue(
      "Maria",
    );
  });

  it("starts with an empty field when Google gave no name", async () => {
    await renderScreen(<GoogleName idToken="token" />);

    expect(screen.getByPlaceholderText(NAME_PLACEHOLDER)).toHaveDisplayValue(
      "",
    );
  });

  it.each([
    ["es-ES", "¿Cómo te llamas?"],
    ["pt-BR", "Qual é o seu nome?"],
  ])("renders in %s", async (locale, title) => {
    await i18n.changeLanguage(locale);

    await renderScreen(<GoogleName idToken="token" />);

    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
  });

  describe("validation", () => {
    it.each([
      ["empty", ""],
      ["one word", "Maria"],
      ["81 characters", `Maria ${"a".repeat(75)}`],
    ])(
      "keeps Continue disabled and sends nothing for a name that is %s",
      async (_, name) => {
        const user = userEvent.setup();
        await renderScreen(<GoogleName idToken="token" initialName={name} />);

        expect(getButton()).toBeDisabled();
        await user.press(getButton());
        await fireEvent(
          screen.getByPlaceholderText(NAME_PLACEHOLDER),
          "submitEditing",
        );

        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it("shows Create account's error on blur and hides it once the name is valid", async () => {
      const user = userEvent.setup();
      await renderScreen(<GoogleName idToken="token" initialName="Maria" />);
      const input = screen.getByPlaceholderText(NAME_PLACEHOLDER);

      await fireEvent(input, "blur");
      expect(
        screen.getByText("Enter your first and last name."),
      ).toBeOnTheScreen();

      await user.type(input, " Souza");

      expect(screen.queryByText("Enter your first and last name.")).toBeNull();
      expect(getButton()).toBeEnabled();
    });
  });

  describe("signing in", () => {
    it("sends the token and the trimmed name, closes the keyboard and signs in", async () => {
      const dismiss = jest.spyOn(Keyboard, "dismiss");
      const user = userEvent.setup();
      const onSignedIn = jest.fn();
      await renderScreen(
        <GoogleName
          idToken="token"
          initialName="Maria"
          onSignedIn={onSignedIn}
        />,
      );
      const input = screen.getByPlaceholderText(NAME_PLACEHOLDER);
      await user.clear(input);
      await user.type(input, "  Maria Souza ");

      await user.press(getButton());

      await waitFor(() =>
        expect(onSignedIn).toHaveBeenCalledWith({ accessToken: "a" }),
      );
      expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/auth/google");
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        idToken: "token",
        name: "Maria Souza",
      });
      expect(dismiss).toHaveBeenCalled();
      dismiss.mockRestore();
    });

    it("submits from the keyboard's done key and works without a handler", async () => {
      await renderScreen(
        <GoogleName idToken="token" initialName="Maria Souza" />,
      );

      await fireEvent(
        screen.getByPlaceholderText(NAME_PLACEHOLDER),
        "submitEditing",
      );

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });

    it("shows the spinner and ignores a second press while sending", async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();
      await renderScreen(
        <GoogleName idToken="token" initialName="Maria Souza" />,
      );

      await user.press(getButton());
      await user.press(getButton());

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(
        screen.root?.queryAll((node) => node.type === "ActivityIndicator"),
      ).toHaveLength(1);
    });
  });

  describe("errors", () => {
    it("shows the toast and goes back to sign-in when the token expired", async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(401, { errors: ["auth.google.tokenInvalid"] }),
      );
      const user = userEvent.setup();
      await renderScreen(
        <GoogleName idToken="token" initialName="Maria Souza" />,
      );

      await user.press(getButton());

      expect(
        await screen.findByText(
          "We couldn't sign you in with Google. Try again.",
        ),
      ).toBeOnTheScreen();
      expect(router.replace).toHaveBeenCalledWith(routes.auth.signIn);
    });

    it.each([
      [
        "no connection",
        () => Promise.reject(new TypeError("Network request failed")),
        "No connection. Check your internet and try again.",
      ],
      [
        "an unverified email",
        () => jsonResponse(401, { errors: ["auth.google.emailNotVerified"] }),
        "Your Google email isn't verified. Use another sign-in method.",
      ],
      [
        "a server error",
        () => jsonResponse(500, { errors: ["INTERNAL_SERVER_ERROR"] }),
        "Something went wrong. Please try again.",
      ],
    ])(
      "shows the message and stays on the screen for %s",
      async (_, answer, message) => {
        fetchMock.mockImplementation(async () => answer());
        const user = userEvent.setup();
        await renderScreen(
          <GoogleName idToken="token" initialName="Maria Souza" />,
        );

        await user.press(getButton());

        expect(await screen.findByText(message)).toBeOnTheScreen();
        expect(router.replace).not.toHaveBeenCalled();
        await waitFor(() => expect(getButton()).toBeEnabled());
      },
    );
  });
});
