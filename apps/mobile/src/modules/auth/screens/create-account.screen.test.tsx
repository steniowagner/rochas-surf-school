import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { router } from "expo-router";

import { AlertMessageProvider } from "@/providers/alert-message";

import { CreateAccountScreen } from "./create-account.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
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
        <CreateAccountScreen />
      </AlertMessageProvider>
    </QueryClientProvider>,
  );

describe("CreateAccountScreen", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({}),
    } as Response);
    process.env.EXPO_PUBLIC_API_URL = "http://api.test";
  });

  it("renders the Create account form", async () => {
    await renderScreen();

    expect(
      screen.getByRole("header", { name: "Create account" }),
    ).toBeOnTheScreen();
  });

  it("opens the confirm code screen after the code is requested", async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.type(
      screen.getByPlaceholderText("First and last name"),
      "Ana Silva",
    );
    await user.type(
      screen.getByPlaceholderText("you@email.com"),
      "ana.silva@gmail.com",
    );

    await user.press(screen.getByRole("button", { name: "Get code" }));

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith({
        pathname: "/auth/confirm-code",
        params: { email: "ana.silva@gmail.com", name: "Ana Silva" },
      }),
    );
  });
});
