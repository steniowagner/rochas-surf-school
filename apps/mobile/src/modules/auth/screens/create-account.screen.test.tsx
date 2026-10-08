import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";

import { CreateAccountScreen } from "./create-account.screen";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

describe("CreateAccountScreen", () => {
  it("renders the Create account form", async () => {
    await render(
      <QueryClientProvider client={new QueryClient()}>
        <CreateAccountScreen />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("header", { name: "Create account" }),
    ).toBeOnTheScreen();
  });
});
