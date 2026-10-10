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
import { createRef, ReactNode, useImperativeHandle, useState } from "react";
import { Platform } from "react-native";

import { routes } from "@/constants/routes";
import i18n from "@/i18n";
import { AlertMessageProvider } from "@/providers/alert-message";
import type { SessionUser } from "@/navigation/resolve-flow.types";
import { SessionContext } from "@/providers/session/session.context";
import type {
  Session,
  SessionContextValue,
} from "@/providers/session/session.types";

import { Whatsapp } from "./whatsapp.component";

jest.mock("expo-router", () => ({
  router: { replace: jest.fn() },
}));

const fetchMock = jest.fn();

const user = {
  id: "user-1",
  name: "Ana Silva",
  email: "ana.silva@gmail.com",
  role: "student",
  status: "approved",
  createdAt: "2026-10-10T12:00:00.000Z",
  whatsappNumber: null,
  whatsappVisible: false,
};

const tokens = {
  accessToken: "at-1",
  accessTokenExpiresAt: "2026-10-10T12:15:00.000Z",
  refreshToken: "rt-1",
  refreshTokenExpiresAt: "2026-11-10T12:00:00.000Z",
};

let queryClient: QueryClient;
const currentSession = createRef<SessionContextValue>();

// A session that starts signed in with the given account, as the app is before the onboarding flow.
function SignedInSession({
  account,
  children,
}: {
  account: SessionUser;
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>({
    user: account,
    tokens,
  });
  const value = {
    user: session?.user ?? null,
    tokens: session?.tokens ?? null,
    setSession,
    clearSession: () => setSession(null),
  };
  useImperativeHandle(currentSession, () => value);

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

const renderWhatsapp = async (account: SessionUser = user) => {
  await render(
    <QueryClientProvider client={queryClient}>
      <AlertMessageProvider>
        <SignedInSession account={account}>
          <Whatsapp />
        </SignedInSession>
      </AlertMessageProvider>
    </QueryClientProvider>,
  );

  return userEvent.setup();
};

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

const numberInput = () => screen.getByLabelText("WhatsApp number");
const saveButton = () =>
  screen.getByRole("button", { name: "Save and continue" });

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { gcTime: Infinity } },
  });
  fetchMock.mockReset();
  jest.mocked(router.replace).mockClear();
  globalThis.fetch = fetchMock;
  process.env.EXPO_PUBLIC_API_URL = "http://api.test";
});

describe("Whatsapp", () => {
  it("shows the approved welcome and the defaults", async () => {
    await renderWhatsapp();

    expect(screen.getByText("Account approved")).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Welcome to Rocha's, Ana" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText("Just one more thing before you start."),
    ).toBeOnTheScreen();
    expect(screen.getByText("WhatsApp number")).toBeOnTheScreen();
    expect(screen.getByText("BR +55")).toBeOnTheScreen();
    expect(numberInput().props.value).toBe("");
    expect(screen.getByText(/We only ask for your number/)).toBeOnTheScreen();
    expect(screen.getByText("Hide my number")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Only the school's admins will see it. You can change this in your profile.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("switch", { name: "Hide my number" }).props.value,
    ).toBe(true);
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("renders on Android, where the keyboard resizes the window", async () => {
    const original = Platform.OS;
    Platform.OS = "android";
    await renderWhatsapp();

    expect(saveButton()).toBeOnTheScreen();
    Platform.OS = original;
  });

  it("shows the first word of a single-word or padded name", async () => {
    await renderWhatsapp({ ...user, name: "  Madonna " });

    expect(
      screen.getByRole("header", { name: "Welcome to Rocha's, Madonna" }),
    ).toBeOnTheScreen();
  });

  it.each([
    ["pt-BR", "Boas-vindas à Rocha's, Ana", "Salvar e continuar"],
    ["es-ES", "Te damos la bienvenida a Rocha's, Ana", "Guardar y continuar"],
  ])("speaks %s", async (language, title, button) => {
    await i18n.changeLanguage(language);
    await renderWhatsapp();

    expect(screen.getByRole("header", { name: title })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: button })).toBeOnTheScreen();
  });

  it("validates the number for the chosen country", async () => {
    const press = await renderWhatsapp();

    await press.type(numberInput(), "85 99999-8888");
    expect(saveButton()).toBeEnabled();

    await press.press(screen.getByText("BR +55"));
    await press.type(screen.getByPlaceholderText("Search country"), "portu");
    await press.press(screen.getByRole("button", { name: "Portugal +351" }));
    expect(screen.getByText("PT +351")).toBeOnTheScreen();
    expect(saveButton()).toBeDisabled();

    await act(async () => numberInput().props.onBlur());
    expect(screen.getByText("Invalid WhatsApp number.")).toBeOnTheScreen();

    await press.clear(numberInput());
    await press.type(numberInput(), "912 345 678");
    expect(screen.queryByText("Invalid WhatsApp number.")).toBeNull();
    expect(saveButton()).toBeEnabled();
  });

  it("shows no error before the first blur or while the field is empty", async () => {
    const press = await renderWhatsapp();

    await press.type(numberInput(), "123", { skipBlur: true });
    expect(screen.queryByText("Invalid WhatsApp number.")).toBeNull();

    await act(async () => numberInput().props.onBlur());
    expect(screen.getByText("Invalid WhatsApp number.")).toBeOnTheScreen();

    await press.clear(numberInput());
    expect(screen.queryByText("Invalid WhatsApp number.")).toBeNull();
  });

  it("refuses letters", async () => {
    const press = await renderWhatsapp();

    await press.type(numberInput(), "abc");

    expect(saveButton()).toBeDisabled();
  });

  it("saves and opens school rules", async () => {
    const saved = { ...user, whatsappNumber: "+5585999998888" };
    respond(200, saved);
    const press = await renderWhatsapp();
    await press.type(numberInput(), "85 99999-8888");

    await press.press(saveButton());

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/auth/me/whatsapp", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer at-1",
      },
      body: JSON.stringify({
        whatsappNumber: "+5585999998888",
        whatsappVisible: false,
      }),
    });
    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        routes.onboarding.schoolRules,
      ),
    );
    expect(currentSession.current?.user).toEqual(saved);
  });

  it("sends whatsappVisible true when the switch is turned off", async () => {
    respond(200, {
      ...user,
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
    });
    const press = await renderWhatsapp();
    await press.type(numberInput(), "85 99999-8888");
    fireEvent(
      screen.getByRole("switch", { name: "Hide my number" }),
      "valueChange",
      false,
    );

    await press.press(saveButton());

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      whatsappNumber: "+5585999998888",
      whatsappVisible: true,
    });
  });

  it("sends the number of the picked country", async () => {
    respond(200, { ...user, whatsappNumber: "+351912345678" });
    const press = await renderWhatsapp();
    await press.press(screen.getByText("BR +55"));
    await press.type(screen.getByPlaceholderText("Search country"), "portu");
    await press.press(screen.getByRole("button", { name: "Portugal +351" }));
    await press.type(numberInput(), "912 345 678");

    await press.press(saveButton());

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).whatsappNumber).toBe(
      "+351912345678",
    );
  });

  it("shows the button loading while saving and ignores another press", async () => {
    let finish: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const press = await renderWhatsapp();
    await press.type(numberInput(), "85 99999-8888");

    await press.press(saveButton());
    await act(async () => numberInput().props.onSubmitEditing());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Save and continue")).toBeNull();

    await act(async () =>
      finish({
        ok: true,
        status: 200,
        json: async () => ({ ...user, whatsappNumber: "+5585999998888" }),
      }),
    );
  });

  it("does not submit an invalid number from the keyboard", async () => {
    const press = await renderWhatsapp();
    await press.type(numberInput(), "123");

    await act(async () => numberInput().props.onSubmitEditing());

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows API errors in a toast and keeps what was typed", async () => {
    respond(422, { errors: ["user.whatsappNumber.phone"] });
    const press = await renderWhatsapp();
    await press.type(numberInput(), "85 99999-8888");

    await press.press(saveButton());

    expect(
      await screen.findByText("Invalid WhatsApp number."),
    ).toBeOnTheScreen();
    expect(numberInput().props.value).toBe("85 99999-8888");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("signs out when the session expired", async () => {
    respond(401, { errors: ["auth.token.invalid"] });
    const press = await renderWhatsapp();
    await press.type(numberInput(), "85 99999-8888");

    await press.press(saveButton());

    expect(
      await screen.findByText("Your session expired. Sign in again."),
    ).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
