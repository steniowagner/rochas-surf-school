import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";

import { AlertMessageProvider } from "@/providers/alert-message";

import { ConfirmCodeScreen } from "./confirm-code.screen";

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => ({
    email: "ana.silva@gmail.com",
    name: "Ana Silva",
  }),
}));

describe("ConfirmCodeScreen", () => {
  it("renders with the params of the route", async () => {
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <AlertMessageProvider>
          <ConfirmCodeScreen />
        </AlertMessageProvider>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("header", { name: "Confirm your email" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("ana.silva@gmail.com")).toBeOnTheScreen();
  });
});
