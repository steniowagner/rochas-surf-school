import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";

import { routes } from "@/constants/routes";
import { AlertMessageProvider } from "@/providers/alert-message";

import { EmailSignInScreen } from "./email-sign-in.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
}));

const renderScreen = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
        })
      }
    >
      <AlertMessageProvider>
        <EmailSignInScreen />
      </AlertMessageProvider>
    </QueryClientProvider>,
  );

describe("EmailSignInScreen", () => {
  beforeEach(() => {
    jest.mocked(router.push).mockClear();
    jest.mocked(router.replace).mockClear();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({}),
    } as Response);
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  it("opens confirm code without a name", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(
      screen.getByPlaceholderText("you@email.com"),
      " ana.silva@gmail.com ",
    );

    await user.press(screen.getByRole("button", { name: "Get code" }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        routes.auth.confirmCode({ email: "ana.silva@gmail.com" }),
      ),
    );
  });

  it("replaces itself with create account keeping the email", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(
      screen.getByPlaceholderText("you@email.com"),
      " ana.silva@gmail.com ",
    );

    await user.press(screen.getByRole("link", { name: "Create account" }));

    expect(router.replace).toHaveBeenCalledWith(
      routes.auth.createAccount({ email: "ana.silva@gmail.com" }),
    );
  });

  it("replaces itself with an empty create account when nothing was typed", async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole("link", { name: "Create account" }));

    expect(router.replace).toHaveBeenCalledWith(routes.auth.createAccount());
  });
});
