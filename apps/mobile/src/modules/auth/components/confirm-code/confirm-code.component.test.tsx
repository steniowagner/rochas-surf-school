import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";
import { ReactElement } from "react";
import { Platform, TextInput as NativeTextInput } from "react-native";

import i18n from "@/i18n";
import { AlertMessageProvider } from "@/providers/alert-message";

import { ConfirmCode } from "./confirm-code.component";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));
jest.useFakeTimers();

const EMAIL = "ana.silva@gmail.com";
const NAME = "Ana Silva";
const CODE = "123456";

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

const SESSION = {
  accessToken: "a",
  accessTokenExpiresAt: "2026-01-01T00:00:00.000Z",
  refreshToken: "r",
  refreshTokenExpiresAt: "2026-02-01T00:00:00.000Z",
  user: {
    id: "1",
    name: NAME,
    email: EMAIL,
    role: "student",
    status: "pending",
  },
};

beforeEach(async () => {
  await i18n.changeLanguage("en-US");
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(jsonResponse(200, SESSION));
  globalThis.fetch = fetchMock;
  jest.mocked(router.back).mockClear();
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

const getInput = () => screen.getByLabelText(i18n.t("confirmCode.inputLabel"));
const getConfirm = () => screen.getByRole("button", { name: "Confirm" });
const getSpinners = () =>
  screen.root?.queryAll((node) => node.type === "ActivityIndicator") ?? [];

const verifyCalls = () =>
  fetchMock.mock.calls.filter(
    ([url]) => url === "http://api.test/auth/email/verify",
  );

describe("ConfirmCode", () => {
  it("renders the confirm code screen", async () => {
    const focus = jest.spyOn(NativeTextInput.prototype, "focus");
    await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

    expect(screen.getByRole("button", { name: "Back" })).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Confirm your email" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "We sent a 6-digit code to ana.silva@gmail.com. It expires in 10 minutes.",
        { exact: false },
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText(EMAIL)).toBeOnTheScreen();
    expect(screen.getAllByTestId("otp-box")).toHaveLength(6);
    expect(getInput().props.autoFocus).toBe(true);
    expect(getInput().props.value).toBe("");
    expect(getConfirm()).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "change the email" }),
    ).toBeOnTheScreen();
    focus.mockRestore();
  });

  it.each([
    ["pt-BR", "Confirme seu e-mail", "Confirmar", "altere o e-mail"],
    ["es-ES", "Confirma tu correo", "Confirmar", "cambia el correo"],
  ])("renders in %s", async (locale, title, submit, link) => {
    await i18n.changeLanguage(locale);

    await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: submit })).toBeOnTheScreen();
    expect(screen.getByRole("link", { name: link })).toBeOnTheScreen();
  });

  it("keeps only digits", async () => {
    const user = userEvent.setup();
    await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

    await user.type(getInput(), "12a3");

    expect(getInput().props.value).toBe("123");
  });

  it("fills the code from a pasted text", async () => {
    await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

    await fireEvent.changeText(getInput(), "Your code: 123 456");

    expect(getInput().props.value).toBe(CODE);
  });

  it("enables Confirm only with six digits", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, { errors: ["request.rate.limited"] }),
    );
    await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

    await fireEvent.changeText(getInput(), "12345");
    expect(getConfirm()).toBeDisabled();

    await fireEvent.changeText(getInput(), CODE);
    await waitFor(() => expect(getInput().props.editable).toBe(true));
    expect(getConfirm()).toBeEnabled();

    await fireEvent.changeText(getInput(), "12345");
    expect(getConfirm()).toBeDisabled();
  });

  it("goes back from change the email and from the back button", async () => {
    const user = userEvent.setup();
    await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

    await user.press(screen.getByRole("link", { name: "change the email" }));
    await user.press(screen.getByRole("button", { name: "Back" }));

    expect(router.back).toHaveBeenCalledTimes(2);
  });

  it("renders on Android, where the keyboard does not add padding", async () => {
    const original = Platform.OS;
    Platform.OS = "android";

    await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

    expect(getConfirm()).toBeOnTheScreen();
    Platform.OS = original;
  });

  describe("confirming", () => {
    it("sends the code again when Confirm is pressed after a failure", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(500, { errors: ["INTERNAL_SERVER_ERROR"] }),
      );
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);
      await fireEvent.changeText(getInput(), CODE);
      await waitFor(() => expect(getInput().props.editable).toBe(true));

      await user.press(getConfirm());

      await waitFor(() => expect(verifyCalls()).toHaveLength(2));
    });

    it("sends the code to verify when the sixth digit is entered", async () => {
      const onVerified = jest.fn();
      await renderScreen(
        <ConfirmCode email={EMAIL} name={NAME} onVerified={onVerified} />,
      );

      await fireEvent.changeText(getInput(), CODE);

      await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
      expect(verifyCalls()).toHaveLength(1);
      expect(JSON.parse(verifyCalls()[0][1].body)).toEqual({
        email: EMAIL,
        code: CODE,
        name: NAME,
      });
      expect(onVerified).toHaveBeenCalledWith(SESSION);
      expect(
        screen.queryByRole("alert", { includeHiddenElements: true }),
      ).toBeNull();
    });

    it("works without an onVerified handler", async () => {
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

      await fireEvent.changeText(getInput(), CODE);

      await waitFor(() => expect(verifyCalls()).toHaveLength(1));
    });

    it("shows a spinner and blocks the input while the request runs", async () => {
      let answer: (response: Response) => void = () => {};
      fetchMock.mockReturnValue(
        new Promise<Response>((resolve) => {
          answer = resolve;
        }),
      );
      const user = userEvent.setup();
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

      await fireEvent.changeText(getInput(), CODE);

      expect(getSpinners()).toHaveLength(1);
      expect(getInput().props.editable).toBe(false);

      await user.press(getConfirm());
      expect(verifyCalls()).toHaveLength(1);

      await act(async () => answer(jsonResponse(200, SESSION)));
      await waitFor(() => expect(getSpinners()).toHaveLength(0));
    });

    it("sends one request at a time", async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

      await fireEvent.changeText(getInput(), CODE);
      await fireEvent.changeText(getInput(), CODE);

      expect(verifyCalls()).toHaveLength(1);
    });

    it.each([
      ["signInCode.code.invalid", 401, "Wrong code. Try again."],
      [
        "signInCode.code.expired",
        401,
        "This code has expired. Request a new one.",
      ],
      [
        "signInCode.attempts.exceeded",
        401,
        "Too many wrong attempts. Request a new code.",
      ],
    ])(
      "shows the inline message for each code error (%s)",
      async (key, status, message) => {
        const focus = jest.spyOn(NativeTextInput.prototype, "focus");
        fetchMock.mockResolvedValue(jsonResponse(status, { errors: [key] }));
        const onVerified = jest.fn();
        await renderScreen(
          <ConfirmCode email={EMAIL} name={NAME} onVerified={onVerified} />,
        );
        focus.mockClear();
        await fireEvent.changeText(getInput(), CODE);

        expect(await screen.findByText(message)).toBeOnTheScreen();
        expect(getInput().props.value).toBe("");
        for (const box of screen.getAllByTestId("otp-box")) {
          expect(box.props.className).toContain("border-bad");
        }
        await waitFor(() => expect(focus).toHaveBeenCalled());
        expect(onVerified).not.toHaveBeenCalled();

        await fireEvent.changeText(getInput(), "1");

        expect(screen.queryByText(message)).toBeNull();
        expect(
          screen.getAllByTestId("otp-box")[0].props.className,
        ).not.toContain("border-bad");
        focus.mockRestore();
      },
    );

    it.each([
      [
        "name refused",
        () => jsonResponse(422, { errors: ["user.name.invalid"] }),
        "We couldn't save your name. Go back and check it.",
      ],
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
      [
        "server error",
        () => jsonResponse(500, { errors: ["INTERNAL_SERVER_ERROR"] }),
        "Something went wrong. Please try again.",
      ],
      [
        "unknown key",
        () => jsonResponse(418, { errors: ["something.unknown"] }),
        "Something went wrong. Please try again.",
      ],
      [
        "not JSON",
        () =>
          ({
            ok: false,
            status: 502,
            json: async () => {
              throw new SyntaxError("Unexpected token");
            },
          }) as unknown as Response,
        "Something went wrong. Please try again.",
      ],
    ])(
      "shows the toast for each other error (%s)",
      async (_, answer, message) => {
        fetchMock.mockImplementation(async () => answer());
        const onVerified = jest.fn();
        await renderScreen(
          <ConfirmCode email={EMAIL} name={NAME} onVerified={onVerified} />,
        );

        await fireEvent.changeText(getInput(), CODE);

        expect(
          await screen.findByText(message, { includeHiddenElements: true }),
        ).toBeOnTheScreen();
        expect(getInput().props.value).toBe(CODE);
        expect(onVerified).not.toHaveBeenCalled();
      },
    );

    it("shows the inline message in pt-BR", async () => {
      await i18n.changeLanguage("pt-BR");
      fetchMock.mockResolvedValue(
        jsonResponse(401, { errors: ["signInCode.code.invalid"] }),
      );
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

      await fireEvent.changeText(getInput(), CODE);

      expect(
        await screen.findByText("Código incorreto. Tente outra vez."),
      ).toBeOnTheScreen();
    });
  });

  describe("resend", () => {
    const COUNTDOWN = "Resend code in 0:30";

    const advance = (ms: number) =>
      act(async () => {
        jest.advanceTimersByTime(ms);
      });

    const codeCalls = () =>
      fetchMock.mock.calls.filter(
        ([url]) => url === "http://api.test/auth/email/code",
      );

    beforeEach(() => {
      jest.setSystemTime(new Date("2026-10-08T12:00:00Z"));
      fetchMock.mockImplementation(async (url: string) =>
        jsonResponse(url.endsWith("/code") ? 202 : 200, {}),
      );
    });

    it("counts down to resend", async () => {
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);
      expect(screen.getByText(COUNTDOWN)).toBeOnTheScreen();

      await advance(1000);
      expect(screen.getByText("Resend code in 0:29")).toBeOnTheScreen();

      await advance(28000);
      expect(screen.getByText("Resend code in 0:01")).toBeOnTheScreen();
      expect(screen.queryByRole("link", { name: "Resend code" })).toBeNull();

      await advance(1000);
      expect(
        screen.getByRole("link", { name: "Resend code" }),
      ).toBeOnTheScreen();
    });

    it("shows the link after a long jump of the clock", async () => {
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);

      await advance(45000);

      expect(
        screen.getByRole("link", { name: "Resend code" }),
      ).toBeOnTheScreen();
    });

    it("resends the code and restarts the countdown", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      fetchMock.mockImplementation(async (url: string) =>
        url.endsWith("/code")
          ? jsonResponse(202, {})
          : jsonResponse(401, { errors: ["signInCode.code.invalid"] }),
      );
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);
      await fireEvent.changeText(getInput(), CODE);
      await screen.findByText("Wrong code. Try again.");
      await advance(30000);

      await user.press(screen.getByRole("link", { name: "Resend code" }));

      await waitFor(() =>
        expect(screen.getByText(COUNTDOWN)).toBeOnTheScreen(),
      );
      expect(codeCalls()).toHaveLength(1);
      expect(JSON.parse(codeCalls()[0][1].body)).toEqual({
        email: EMAIL,
        locale: "en",
      });
      expect(getInput().props.value).toBe("");
      expect(screen.queryByText("Wrong code. Try again.")).toBeNull();
    });

    it("treats resend too soon as success", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      fetchMock.mockResolvedValue(
        jsonResponse(429, { errors: ["signInCode.resend.tooSoon"] }),
      );
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);
      await advance(30000);

      await user.press(screen.getByRole("link", { name: "Resend code" }));

      await waitFor(() =>
        expect(screen.getByText(COUNTDOWN)).toBeOnTheScreen(),
      );
    });

    it("sends nothing while the countdown runs or a resend is in flight", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      fetchMock.mockReturnValue(new Promise(() => {}));
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);
      await advance(30000);
      const link = screen.getByRole("link", { name: "Resend code" });

      await user.press(link);
      await user.press(link);

      expect(codeCalls()).toHaveLength(1);
    });

    it.each([
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
    ])("shows the toast when resend fails (%s)", async (_, answer, message) => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      fetchMock.mockImplementation(async () => answer());
      await renderScreen(<ConfirmCode email={EMAIL} name={NAME} />);
      await advance(30000);

      await user.press(screen.getByRole("link", { name: "Resend code" }));

      expect(
        await screen.findByText(message, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole("link", { name: "Resend code" }),
      ).toBeOnTheScreen();
    });
  });
});
